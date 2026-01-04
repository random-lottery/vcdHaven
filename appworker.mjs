// --- Global State ---
// 在 Deno 环境中，`Deno.Kv` 实例通常在模块顶层创建一次，并在应用程序生命周期中复用。
// `videos`, `storagedata`, `nextVideoId` 仍然是内存中的全局变量。
// 数据会在每次请求处理前从 KV 加载，处理后保存回 KV，以确保持久性。
let kv = null; // Deno Kv 实例
let videos = [];
let storagedata = [];
let nextVideoId = 1;

// --- Utility Classes and Functions ---

/**
 * HttpError class for consistent error handling.
 */
class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    Object.setPrototypeOf(this, HttpError.prototype);
    this.status = status;
  }
}

/**
 * Applies CORS headers to ResponseInit options.
 * @param {ResponseInit} [responseOptions={}] - Optional ResponseInit object to modify.
 * @returns {ResponseInit} ResponseInit with CORS headers.
 */
const fixCors = (responseOptions = {}) => {
  const headers = new Headers(responseOptions.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  responseOptions.headers = headers;
  return responseOptions;
};

/**
 * Handles OPTIONS requests for CORS preflight.
 * @returns {Response} A Response for a preflight request.
 */
const handleOPTIONS = () => {
  return new Response(null, fixCors({ status: 204 }));
};

// --- Deno KV Operations ---

/**
 * Initializes the Deno KV store. Should be called once.
 */
async function initializeKv() {
    if (!kv) {
        try {
            // Deno.openKv() 用于打开一个 KV 存储
            // 在 Deno Deploy 上，它会自动连接到项目的远程 KV
            // 在本地，它会在当前目录创建 .sqlite 文件
            kv = await Deno.openKv();
            console.log('[INFO] Deno KV store initialized.');
        } catch (error) {
            console.error('[CRITICAL] Failed to initialize Deno KV store:', error);
            throw new HttpError("Failed to initialize KV store.", 500);
        }
    }
}

/**
 * Loads video data from Deno KV.
 */
async function loadVideos() {
    if (!kv) await initializeKv(); // 确保 KV 已初始化
    try {
        const result = await kv.get(["videos_data"]);
        if (result.value) {
            const videoData = JSON.parse(result.value);
            videos = videoData;

            let maxId = 0;
            videos.forEach(group => {
                if (group.videolist && Array.isArray(group.videolist)) {
                    group.videolist.forEach(video => {
                        const videoId = parseInt(video.id);
                        if (!isNaN(videoId) && videoId > maxId) {
                            maxId = videoId;
                        }
                    });
                }
            });
            nextVideoId = maxId + 1;
            console.log(`[INFO] Videos loaded from KV. Next Video ID will be: ${nextVideoId}`);
        } else {
            console.warn('[WARN] No video data found in KV, initializing with empty video list.');
            videos = JSON.parse(Deno.env.get('videos_data') || '[]');  // 从环境变量中获取初始视频数据
            let maxId = 0;
            videos.forEach(group => {
                if (group.videolist && Array.isArray(group.videolist)) {
                    group.videolist.forEach(video => {
                        const videoId = parseInt(video.id);
                        if (!isNaN(videoId) && videoId > maxId) {
                            maxId = videoId;
                        }
                    });
                }
            });
            nextVideoId = maxId + 1;
            console.log(`[INFO] Videos initialized from environment variable. Next Video ID will be: ${nextVideoId}`);  
            nextVideoId = 1;
        }
    } catch (err) {
        console.error('Error loading videos from KV:', err);
        await kv.set(["videos_data"], '[]');
        throw new HttpError(`Failed to load video data from KV: ${err.message}`, 500);
    }
}

/**
 * Saves current video data to Deno KV.
 */
async function saveVideos() {
    if (!kv) await initializeKv();
    try {
        // KV 可以存储任意可序列化对象，但这里为了与原始 JSON 格式化一致，仍使用 JSON.stringify
        await kv.set(["videos_data"], JSON.stringify(videos, null, 2));
        console.log('[INFO] Videos saved to KV successfully.');
    } catch (err) {
        console.error('Error saving videos to KV:', err);
        throw new HttpError("Failed to save video data to KV.", 500);
    }
}

/**
 * Loads storage data from Deno KV.
 */
async function loadStorages() {
    if (!kv) await initializeKv();
    try {
        const result = await kv.get(["storages_data"]);
        if (result.value) {
            storagedata = JSON.parse(result.value);
            console.log('[INFO] Storage data loaded from KV.');
        } else {
            console.warn('[WARN] No storage data found in KV, initializing with empty storage data.');
            storagedata = [];
        }
    } catch (err) {
        console.error('Error loading storages from KV:', err);
        throw new HttpError(`Failed to load storage data from KV: ${err.message}`, 500);
    }
}

/**
 * Saves current storage data to Deno KV.
 */
async function saveStorages() {
    if (!kv) await initializeKv();
    try {
        await kv.set(["storages_data"], JSON.stringify(storagedata, null, 2));
        console.log('[INFO] Storage data saved to KV successfully.');
    } catch (err) {
        console.error('Error saving storages to KV:', err);
        throw new HttpError("Failed to save storage data to KV.", 500);
    }
}

// 模块初始化时尝试初始化 KV 并加载数据。
// 在 Deno Deploy 上，这会在 Worker 实例启动时发生一次。
// 在本地运行时，它也会在脚本启动时执行。
(async () => {
    try {
        await initializeKv(); // 先初始化 KV
        await loadVideos();
        await loadStorages();
    } catch (e) {
        console.error("[CRITICAL] Initial KV setup or data load failed:", e.message);
        // 如果这里失败，后续的请求可能无法正常工作。
        // 在生产环境中，可能需要更复杂的启动失败处理。
    }
})();

/**
 * 将视频数据渲染为完整的、带有样式的 HTML 字符串。
 * @param {Array<object>} data - 视频数据数组。
 * @returns {string} 完整的 HTML 文档字符串。
 */
function renderVideoDataToHTML(data) {
  // --- 1. CSS 样式定义 (使用模板字符串) ---
  // 这种方式将样式与组件逻辑紧密耦合，便于维护
  const styles = `
    <style>
      /* 基础重置和页面设置 */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      body {
        background-color: #444444;
        padding: 2rem;
        line-height: 1.6;
      }

      /* 主容器，实现居中 */
      .main-container {
        max-width: 1024px;
        margin: 0 auto; /* 核心：水平居中 */
        background-color: #f4f4f4;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      /* 视频卡片样式 */
      .video-card {
        border: 1px solid #e0e0e0;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border-radius: 6px;
        transition: box-shadow 0.3s ease;
      }

      .video-card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }

      .video-card h2 {
        color: #333;
        margin-bottom: 0.5rem;
      }

      .video-card p {
        color: #666;
        margin-bottom: 1rem;
      }

      .video-card img {
        width: 100%;
        max-width: 600px;
        height: auto;
        border-radius: 4px;
        margin-bottom: 1rem;
      }

      /* 视频列表样式 */
      .video-list {
        list-style: none; /* 移除默认的列表项标记 */
        padding-left: 0;
        display: ruby;
        flex-direction: row;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        align-content: center;
        gap: 1rem;
        margin-bottom: 1rem;
        padding-left: 0;
      }

      .video-list-item {
        list-style: none;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
      }

      /* 列表项的色块样式，方便Tab键定位 */
      .list-item-indicator {
        width: 12px;
        height: 12px;
        background-color: #007bff; /* 蓝色色块 */
        border-radius: 50%; /* 圆形色块 */
        margin-left: 0.75rem;
        flex-shrink: 0; /* 防止色块被压缩 */
      }

      /* 链接和视频的通用样式 */
      .video-link, .video-player-container {
        text-decoration: none;
        color: #007bff;
        font-weight: 500;
        flex-grow: 1; /* 占据剩余空间 */
      }

      .video-link:hover {
        text-decoration: underline;
      }
      
      .video-player-container p {
        margin-bottom: 0.5rem;
      }

      video {
        width: 100%;
        max-width: 320px;
        height: auto;
        border-radius: 4px;
      }

      /* 当元素获得焦点时（例如通过Tab键），提供更明显的视觉反馈 */
      a:focus, video:focus {
        outline: 3px solid #007bff;
        outline-offset: 2px;
      }
    </style>
  `;

  // --- 2. HTML 内容生成 ---
  let bodyContent = '';

  data.forEach((video) => {
    bodyContent += `
      <article class="video-card">
        <h2>视频名: ${video.videoname}</h2>
        <p>简介: ${video.videointro}</p>
        <img src="${video.videoname}" alt="${video.videoname}封面" />
        <p>视频总数: ${video.videocount}</p>
        
        <h3>视频列表:</h3>
        <ul class="video-list">
    `;

    if (video.videolist && video.videolist.length > 0) {
      video.videolist.forEach(item => {
        if (item.url && item.title) {
          const isVideoFile = /\.(mp4|mov|webm|ogg)$/i.test(item.url);
          bodyContent += '<li class="video-list-item">';
          bodyContent += '<span class="list-item-indicator" aria-hidden="true"></span>'; // 色块，aria-hidden="true" 对屏幕阅读器隐藏

          if (isVideoFile) {
            // 提取视频类型，例如 'mp4'
            const videoType = item.url.split('.').pop().toLowerCase();
            bodyContent += `
              <div class="video-player-container">
                <p>${item.title}</p>
                <video controls src="${item.url}" poster="${item.snapshot}" type="video/${videoType}">
                  您的浏览器不支持 video 标签。
                </video>
                <p>${item.summary}</p>
              </div>
            `;
          } else {
            bodyContent += `<a class="video-link" href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a>`;
          }
          bodyContent += '</li>';
        }
      });
    } else {
      bodyContent += `
        <li class="video-list-item">
          <span class="list-item-indicator" aria-hidden="true"></span>
          <span>暂无视频内容</span>
        </li>
      `;
    }

    bodyContent += `
        </ul>
      </article>
    `;
  });

  // --- 3. 组装完整的 HTML 文档 ---
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>视频列表</title>
      ${styles}
    </head>
    <body bgcolor=black>
      <main class="main-container">
        ${bodyContent}
      </main>
    </body>
    </html>
  `;

  return htmlContent;
}

export default {
  /**
   * Main fetch handler for all incoming requests.
   * @param {Request} request - The incoming Request object.
   * @returns {Promise<Response>} A Promise that resolves to a Response object.
   */
  async fetch(request) {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleOPTIONS();
    }

    // 统一错误处理函数
    const errHandler = (err) => {
      console.error("[ERROR]", err);
      const status = (err instanceof HttpError) ? err.status : 500;
      const message = err.message || "Internal Server Error";
      return new Response(message, fixCors({ status: status, headers: { 'Content-Type': 'text/plain' } }));
    };

    try {
      // Authorization header (保留原始模板，但在此示例中未使用)
      // const auth = request.headers.get("Authorization");

      // 断言函数，用于检查条件并抛出 HttpError
      const assert = (success, message = "Method Not Allowed", status = 405) => {
        if (!success) {
          throw new HttpError(message, status);
        }
      };

      const url = new URL(request.url); // 解析请求 URL
      const { pathname } = url;

      // 在每个请求中重新加载数据，以确保数据是最新的。
      // 注意：由于 KV 是持久化的，每次请求重新加载是确保数据新鲜度的关键。
      // 对于高并发或数据频繁更新的场景，考虑更细粒度的锁或事务机制（Deno KV 提供原子操作 API）。
      await loadVideos();
      await loadStorages();

      // 根据请求方法和路径进行路由
      switch (true) {
        // --- GET Endpoints ---
        case request.method === "GET" && pathname === "/videos":
          let allVideos = [];
          videos.forEach(videoObj => {
              if (videoObj.videolist && Array.isArray(videoObj.videolist)) {
                  allVideos = allVideos.concat(videoObj.videolist);
              }
          });
          return new Response(JSON.stringify(allVideos), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "GET" && pathname === "/mockdata":
          return new Response(JSON.stringify(storagedata), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "GET" && pathname === "/plain":
          return new Response(renderVideoDataToHTML(videos), fixCors({ status: 200, headers: { 'Content-Type': 'text/html;charset=UTF-8' } }));
          
        case request.method === "GET" && pathname.startsWith("/videolist"):
          let groupVideos = [];
          const pathParts = pathname.split('/').filter(part => part); // Filter out empty strings
          const groupName = pathParts[1]; // After filtering, index 0 is "videolist", 1 is groupName
          const videoId = pathParts[2]; // Optional video ID
          
          if (!groupName) {
            // throw new HttpError("Invalid group name.", 400);
            return new Response(JSON.stringify(videos), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          
          let groupFound = false;
          let videoIdFound = false;
          videos.forEach(group => {
            if (group.videolist && Array.isArray(group.videolist)) {
              if (group.videoname === groupName) {
                groupFound = true;
                if (videoId) {
                  // If videoId is provided, find and return only that video
                  const foundVideo = group.videolist.map(video => {
                    if (String(video.id) === String(videoId)) {
                      videoIdFound = true;
                      return {...video};
                    }
                  });
                  if (videoIdFound) {
                    groupVideos = [{ ...foundVideo }];
                  }
                } else {
                  // If no videoId, return all videos in the group
                  groupVideos = groupVideos.concat(group.videolist.map(video => ({ ...video })));
                }
              }
            }
          });

          if (!videoIdFound && videoId) {
            throw new HttpError(`Video with ID ${videoId} not found in group ${groupName}.`, 404);
          }
          if (!groupFound) {
            throw new HttpError(`Video group "${groupName}" not found.`, 404);
          }
          
          return new Response(JSON.stringify(groupVideos), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        case pathname.startsWith("/denoenv/"):
          if (!kv) await initializeKv();
          const envOpParts = pathname.split('/').filter(part => part);
          const operation = envOpParts[1]; // After filtering, index 0 is "denoenv", 1 is operation ("get" or "set")
          const variableName = envOpParts[2]; // Index 2 is the variable name
          
          if (!variableName) {
            throw new HttpError("Variable name is required.", 400);
          }
          
          const kvKey = [variableName];
          
          if (operation === "get" && request.method === "GET") {
            // GET /denoenv/get/variableName: Retrieve the value from KV and env
            try {
              const envresult = Deno.env.get(variableName); // Deno.env.get() expects a string, not an array
              const kvresult = await kv.get(kvKey);
              const responseData = {
                key: variableName,
                kvresult: kvresult.value !== null ? kvresult.value : null,
                envresult: envresult !== null && envresult !== undefined ? envresult : null, // Deno.env.get() returns string or undefined, not an object
              };
              return new Response(JSON.stringify(responseData), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));
            } catch (err) {
              console.error(`Error getting KV variable ${variableName}:`, err);
              throw new HttpError(`Failed to get KV variable: ${err.message}`, 500);
            }
          } else if (operation === "set" && request.method === "GET") {
            // GET /denoenv/set/variableName: Set the value in KV from env variable
            try {
              const envValue = Deno.env.get(variableName); // Deno.env.get() expects a string, not an array
              if (!envValue) {
                throw new HttpError(`Environment variable ${variableName} not found.`, 404);
              }
              const value = envValue;
              // Store the value in KV (Deno KV can store any serializable value)
              await kv.set(kvKey, value);
              
              const responseData = {
                key: variableName,
                value: value,
                message: "Variable set successfully"
              };
              return new Response(JSON.stringify(responseData), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));
            } catch (err) {
              console.error(`Error setting KV variable ${variableName}:`, err);
              if (err instanceof HttpError) {
                throw err;
              }
              throw new HttpError(`Failed to set KV variable: ${err.message}`, 500);
            }
          } else {
            throw new HttpError(`Invalid operation or method. Use GET /denoenv/get/{name} or GET /denoenv/set/{name}`, 400);
          }

        // --- POST Endpoints ---
        case request.method === "POST" && pathname === "/videos":
          const newVideo = await request.json();
          newVideo.id = nextVideoId++; // 分配新的唯一 ID
          if (videos.length > 0 && videos[0].videolist && Array.isArray(videos[0].videolist)) {
              videos[0].videolist.push(newVideo);
          } else {
              // 如果没有视频组，则创建一个新的默认组
              videos.push({
                  videoname: "New Video Group",
                  videointro: "A new video group",
                  videopicture: "default.jpg",
                  videocount: 1,
                  videolist: [newVideo]
              });
          }
          await saveVideos(); // 保存到 KV
          return new Response(JSON.stringify(newVideo), fixCors({ status: 201, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "POST" && pathname === "/newvideogroup":
          const newVideoGroup = await request.json();
          newVideoGroup.videocount = newVideoGroup.videolist ? newVideoGroup.videolist.length : 0;
          if (newVideoGroup.videolist && Array.isArray(newVideoGroup.videolist)) {
            newVideoGroup.videolist.forEach(video => {
                video.id = nextVideoId++;
            });
          }
          videos.push(newVideoGroup);
          await saveVideos(); // 保存到 KV
          return new Response(JSON.stringify(newVideoGroup), fixCors({ status: 201, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "POST" && pathname === "/movevideos":
          const { sourceGroupIndex, destGroupIndex, selectedVideos } = await request.json();

          if (sourceGroupIndex < 0 || sourceGroupIndex >= videos.length ||
              destGroupIndex < 0 || destGroupIndex >= videos.length ||
              !Array.isArray(selectedVideos)) {
            throw new HttpError("Invalid group indices or selected videos array.", 400);
          }

          const sourceGroup = videos[sourceGroupIndex];
          const destGroup = videos[destGroupIndex];

          if (!sourceGroup || !sourceGroup.videolist || !destGroup || !destGroup.videolist) {
            throw new HttpError("Source or destination video group not found or malformed.", 404);
          }

          const videosToMove = [];
          // 过滤掉源组中要移动的视频，并收集这些视频
          sourceGroup.videolist = sourceGroup.videolist.filter(video => {
             if (selectedVideos.includes(video.id)) {
                 videosToMove.push(video);
                 return false; // 从源组中移除
             }
             return true; // 保留在源组中
          });
          sourceGroup.videocount = sourceGroup.videolist.length; // 更新计数

          // 将收集到的视频添加到目标组
          destGroup.videolist = destGroup.videolist.concat(videosToMove);
          destGroup.videocount = destGroup.videolist.length; // 更新计数

          await saveVideos(); // 保存到 KV
          return new Response(null, fixCors({ status: 200 }));

        case request.method === "POST" && pathname === "/savevideodetails":
          const { id, url: videoUrl, snapshot, summary } = await request.json();

          // Basic validation
          if (!id || !url || !snapshot || !summary) {
              throw new HttpError('Missing required fields (id, url, snapshot, summary).', 400);
          }

          // Find and update the existing video
          let detailVideoFound = false;
          let updatedDetailVideo = null;
          
          videos.forEach(group => {
              if (group.videolist && Array.isArray(group.videolist)) {
                  group.videolist = group.videolist.map(video => {
                      // Compare IDs as strings to handle both string and number IDs
                      if (video.id == id) {
                          detailVideoFound = true;
                          // Update the video with new data, preserving the ID and other fields
                          updatedDetailVideo = {
                              ...video,
                              url: videoUrl,
                              snapshot: snapshot,
                              summary: summary,
                              id: video.id // Preserve the original ID
                          };
                          return updatedDetailVideo;
                      }
                      return video;
                  });
              }
          });

          if (!detailVideoFound) {
              throw new HttpError(`Video with ID ${vId} not found.`, 404);
          }

          await saveVideos(); // 保存到 KV
          return new Response(JSON.stringify(updatedDetailVideo), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "POST" && pathname === "/postselecteddata":
          const selectedDataPost = await request.json();
          storagedata = selectedDataPost;
          console.log('Received selected data:', selectedDataPost);
          await saveStorages(); // 保存到 KV
          return new Response('Data posted successfully!', fixCors({ status: 200 }));

        case request.method === "POST" && pathname === "/saveselecteddata":
          const selectedDataSave = await request.json();
          storagedata = selectedDataSave;
          await saveStorages(); // 保存到 KV
          return new Response('Data saved successfully!', fixCors({ status: 200 }));

        // --- PUT Endpoints ---
        case request.method === "PUT" && pathname.startsWith('/videos/'):
          const videoIdToUpdate = parseInt(pathname.split('/')[2]);
          if (isNaN(videoIdToUpdate)) {
            throw new HttpError("Invalid video ID.", 400);
          }
          const updatedVideo = await request.json();
          let videoFound = false;
          videos.forEach(group => {
              if (group.videolist && Array.isArray(group.videolist)) {
                  group.videolist = group.videolist.map(video => {
                      if (video.id == videoIdToUpdate) {
                          videoFound = true;
                          return { ...video, ...updatedVideo, id: videoIdToUpdate }; // 合并更新并确保ID不变
                      }
                      return video;
                  });
              }
          });

          if (!videoFound) {
            throw new HttpError(`Video with ID ${videoIdToUpdate} not found.`, 404);
          }

          await saveVideos(); // 保存到 KV
          return new Response(JSON.stringify(updatedVideo), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        // --- DELETE Endpoints ---
        case request.method === "DELETE" && pathname.startsWith('/videos/'):
          const videoIdToDelete = parseInt(pathname.split('/')[2]);
          if (isNaN(videoIdToDelete)) {
            throw new HttpError("Invalid video ID.", 400);
          }
          let videoDeleted = false;
          videos.forEach(group => {
              if (group.videolist && Array.isArray(group.videolist)) {
                  const initialLength = group.videolist.length;
                  group.videolist = group.videolist.filter(video => video.id !== videoIdToDelete);
                  if (group.videolist.length < initialLength) {
                      videoDeleted = true;
                      group.videocount = group.videolist.length; // 更新计数
                  }
              }
          });

          if (!videoDeleted) {
            throw new HttpError(`Video with ID ${videoIdToDelete} not found.`, 404);
          }

          await saveVideos(); // 保存到 KV
          return new Response(null, fixCors({ status: 204 }));

        case request.method === "DELETE" && pathname.startsWith('/deletevideogroup/'):
          const groupIndexToDelete = parseInt(pathname.split('/')[2]);
          if (isNaN(groupIndexToDelete)) {
            throw new HttpError("Invalid group index.", 400);
          }
          if (groupIndexToDelete < 0 || groupIndexToDelete >= videos.length) {
            throw new HttpError(`Video group with index ${groupIndexToDelete} not found.`, 404);
          }

          videos = videos.filter((group, index) => index !== groupIndexToDelete);
          await saveVideos(); // 保存到 KV
          return new Response(null, fixCors({ status: 204 }));

        default:
          throw new HttpError("404 Not Found", 404);
      }
    } catch (err) {
      return errHandler(err);
    }
  }
};
