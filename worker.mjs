import fs from 'fs';
import { promisify } from 'util'; // For Node.js fs functions

// Promisify fs methods for async/await usage
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// --- Global State ---
// 注意：在无服务器环境中，这些全局变量的持久性可能不可靠。
// 理想情况下，数据应从外部持久存储（如 KV 存储）加载和保存。
let videos: any[] = [];
let storagedata: any[] = [];
let nextVideoId: number = 1;

// --- Utility Classes and Functions ---

/**
 * HttpError class for consistent error handling.
 */
class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    // 修复 instanceof 检查，确保继承关系正确
    Object.setPrototypeOf(this, HttpError.prototype);
    this.status = status; // 确保 status 被正确赋值
  }
}

/**
 * Applies CORS headers to ResponseInit options.
 * @param responseOptions - Optional ResponseInit object to modify.
 * @returns ResponseInit with CORS headers.
 */
const fixCors = (responseOptions: ResponseInit = {}): ResponseInit => {
  const headers = new Headers(responseOptions.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With"); // 增加常用头
  responseOptions.headers = headers;
  return responseOptions;
};

/**
 * Handles OPTIONS requests for CORS preflight.
 * @returns A Response for a preflight request.
 */
const handleOPTIONS = (): Response => {
  return new Response(null, fixCors({ status: 204 }));
};

// --- Data Loading and Saving Functions ---

/**
 * Loads video data from 'videos.json' and initializes nextVideoId.
 */
async function loadVideos(): Promise<void> {
    try {
        const data: string = await readFile('videos.json', 'utf8');
        const videoData: any[] = JSON.parse(data);
        videos = videoData;

        // Find the maximum video ID to ensure nextVideoId is unique
        let maxId = 0;
        videos.forEach(group => {
            if (group.videolist && Array.isArray(group.videolist)) {
                group.videolist.forEach((video: any) => {
                    const videoId = parseInt(video.id);
                    if (!isNaN(videoId) && videoId > maxId) {
                        maxId = videoId;
                    }
                });
            }
        });
        nextVideoId = maxId + 1; // Set nextVideoId to max + 1
        console.log(`[INFO] Videos loaded. Next Video ID will be: ${nextVideoId}`);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.warn('[WARN] videos.json not found, initializing with empty video list.');
            videos = [];
            nextVideoId = 1;
        } else {
            console.error('Error reading videos.json:', err);
            // 抛出错误以在更上层处理
            throw new HttpError(`Failed to load video data: ${err.message}`, 500);
        }
    }
}

/**
 * Saves current video data to 'videos.json'.
 */
async function saveVideos(): Promise<void> {
    try {
        await writeFile('videos.json', JSON.stringify(videos, null, 2), 'utf8');
        console.log('[INFO] videos.json saved successfully.');
    } catch (err: any) {
        console.error('Error writing videos.json:', err);
        throw new HttpError("Failed to save video data.", 500);
    }
}

/**
 * Loads storage data from 'storages.json'.
 */
async function loadStorages(): Promise<void> {
    try {
        const data: string = await readFile('storages.json', 'utf8');
        storagedata = JSON.parse(data);
        console.log('[INFO] storages.json loaded.');
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            console.warn('[WARN] storages.json not found, initializing with empty storage data.');
            storagedata = [];
        } else {
            console.error('Error reading storages.json:', err);
            throw new HttpError(`Failed to load storage data: ${err.message}`, 500);
        }
    }
}

/**
 * Saves current storage data to 'storages.json'.
 */
async function saveStorages(): Promise<void> {
    try {
        await writeFile('storages.json', JSON.stringify(storagedata, null, 2), 'utf8');
        console.log('[INFO] storages.json saved successfully.');
    } catch (err: any) {
        console.error('Error writing storages.json:', err);
        throw new HttpError("Failed to save storage data.", 500);
    }
}

// 模块初始化时尝试加载数据
// 在无服务器环境中，这可能只在首次冷启动时发生。
// 为保证数据新鲜度，`fetch` 处理器内部也会调用 `loadVideos()` 和 `loadStorages()`。
(async () => {
    try {
        await loadVideos();
        await loadStorages();
    } catch (e: any) {
        console.error("[CRITICAL] Initial data load failed:", e.message);
        // 如果这里失败，后续的请求可能无法正常工作。
        // 在生产环境中，可能需要更复杂的启动失败处理。
    }
})();


export default {
  /**
   * Main fetch handler for all incoming requests.
   * @param request - The incoming Request object.
   * @returns A Promise that resolves to a Response object.
   */
  async fetch(request: Request): Promise<Response> {
    // 处理 CORS 预检请求
    if (request.method === "OPTIONS") {
      return handleOPTIONS();
    }

    // 统一错误处理函数
    const errHandler = (err: HttpError | Error): Response => {
      console.error("[ERROR]", err);
      const status = (err instanceof HttpError) ? err.status : 500;
      const message = err.message || "Internal Server Error";
      return new Response(message, fixCors({ status: status, headers: { 'Content-Type': 'text/plain' } }));
    };

    try {
      // Authorization header (保留原始模板，但在此示例中未使用)
      // const auth = request.headers.get("Authorization");

      // 断言函数，用于检查条件并抛出 HttpError
      const assert = (success: boolean, message: string = "Method Not Allowed", status: number = 405) => {
        if (!success) {
          throw new HttpError(message, status);
        }
      };

      const url = new URL(request.url); // 解析请求 URL
      const { pathname } = url;

      // 在每个请求中重新加载数据，以确保数据是最新的。
      // 对于高并发或数据频繁更新的场景，这可能导致性能瓶颈或竞态条件。
      // 在生产环境中，数据应由外部持久存储（如数据库）管理。
      await loadVideos();
      await loadStorages();

      // 根据请求方法和路径进行路由
      switch (true) {
        // --- GET Endpoints ---
        case request.method === "GET" && (pathname === "/videos" || pathname === "/videolist"):
          let allVideos: any[] = [];
          videos.forEach(videoObj => {
              if (videoObj.videolist && Array.isArray(videoObj.videolist)) {
                  allVideos = allVideos.concat(videoObj.videolist);
              }
          });
          return new Response(JSON.stringify(allVideos), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "GET" && pathname === "/mockdata":
          return new Response(JSON.stringify(storagedata), fixCors({ status: 200, headers: { 'Content-Type': 'application/json' } }));

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
          await saveVideos();
          return new Response(JSON.stringify(newVideo), fixCors({ status: 201, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "POST" && pathname === "/newvideogroup":
          const newVideoGroup = await request.json();
          newVideoGroup.videocount = newVideoGroup.videolist ? newVideoGroup.videolist.length : 0;
          if (newVideoGroup.videolist && Array.isArray(newVideoGroup.videolist)) {
            newVideoGroup.videolist.forEach((video: any) => {
                video.id = nextVideoId++;
            });
          }
          videos.push(newVideoGroup);
          await saveVideos();
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

          const videosToMove: any[] = [];
          // 过滤掉源组中要移动的视频，并收集这些视频
          sourceGroup.videolist = sourceGroup.videolist.filter((video: any) => {
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

          await saveVideos();
          return new Response(null, fixCors({ status: 200 }));

        case request.method === "POST" && pathname === "/savevideodetails":
          const { url: videoUrl, snapshot, summary } = await request.json();

          // Basic validation
          if (!videoUrl || !snapshot || !summary) {
              throw new HttpError('Missing required fields (url, snapshot, summary).', 400);
          }

          // Create a new video object
          const newDetailVideo = {
              id: nextVideoId++,
              url: videoUrl,
              snapshot: snapshot,
              summary: summary
          };

          // Add the new video to the first video group
          if (videos.length > 0 && videos[0].videolist && Array.isArray(videos[0].videolist)) {
              videos[0].videolist.push(newDetailVideo);
              videos[0].videocount = videos[0].videolist.length; // 更新计数
          } else {
              // If there are no video groups, create one
              videos.push({
                  videoname: "New Video Group",
                  videointro: "A new video group",
                  videopicture: "default.jpg",
                  videocount: 1, // 初始计数
                  videolist: [newDetailVideo]
              });
          }

          await saveVideos();
          return new Response(JSON.stringify(newDetailVideo), fixCors({ status: 201, headers: { 'Content-Type': 'application/json' } }));

        case request.method === "POST" && pathname === "/postselecteddata":
          const selectedDataPost = await request.json();
          storagedata = selectedDataPost;
          console.log('Received selected data:', selectedDataPost); // 此处保留原始日志
          // 在无服务器环境中，如果需要持久化，这里应调用 saveStorages();
          // await saveStorages();
          return new Response('Data posted successfully!', fixCors({ status: 200 }));

        case request.method === "POST" && pathname === "/saveselecteddata":
          const selectedDataSave = await request.json();
          storagedata = selectedDataSave;
          await saveStorages(); // 持久化数据
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
                  group.videolist = group.videolist.map((video: any) => {
                      if (video.id === videoIdToUpdate) {
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

          await saveVideos();
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
                  group.videolist = group.videolist.filter((video: any) => video.id !== videoIdToDelete);
                  if (group.videolist.length < initialLength) {
                      videoDeleted = true;
                      group.videocount = group.videolist.length; // 更新计数
                  }
              }
          });

          if (!videoDeleted) {
            throw new HttpError(`Video with ID ${videoIdToDelete} not found.`, 404);
          }

          await saveVideos();
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
          await saveVideos();
          return new Response(null, fixCors({ status: 204 }));

        default:
          throw new HttpError("404 Not Found", 404);
      }
    } catch (err: any) {
      return errHandler(err);
    }
  }
};
