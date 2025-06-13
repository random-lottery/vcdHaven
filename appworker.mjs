import fs from 'fs';
import { URL } from 'url';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

let videos: any[] = [];
let storagedata: any[] = [];
let nextVideoId: number = 1;

// Load videos from videos.json (Asynchronous)
async function loadVideos(): Promise<void> {
    try {
        const data: string = await readFile('videos.json', 'utf8');
        const videoData: any[] = JSON.parse(data);
        videos = videoData;

        // Find the maximum video ID
        videos.forEach(group => {
            group.videolist.forEach(video => {
                const videoId: number = parseInt(video.id);
                if (!isNaN(videoId) && videoId >= nextVideoId) {
                    nextVideoId = videoId + 1;
                }
            });
        });
    } catch (err: any) {
        console.error('Error reading videos.json:', err);
        // 即使加载失败，也要确保`videos`是空数组，防止后续操作出错
        videos = [];
    }
}

// Save videos to videos.json (Asynchronous)
const saveVideos = async (): Promise<void> => {
    try {
        await writeFile('videos.json', JSON.stringify(videos, null, 2), 'utf8');
    } catch (err: any) {
        console.error('Error writing videos.json:', err);
    }
};

const saveStorages = async (): Promise<void> => {
    try {
        await writeFile('storages.json', JSON.stringify(storagedata, null, 2), 'utf8');
    } catch (err: any) {
        console.error('Error writing storages.json:', err);
    }
};

export async function handleAPIRequest(req: Request): Promise<Response> {
    const url = new URL(req.url); // Use URL object
    await loadVideos(); // Load videos data

    // Set CORS headers to allow all origins
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: headers
        });
    }

    try {
        if (req.method === 'GET') {
            if (url.pathname === '/videos') {
                let allVideos = [];
                videos.forEach(videoObj => {
                    allVideos = allVideos.concat(videoObj.videolist);
                });
                return new Response(JSON.stringify(allVideos), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else if (url.pathname === '/videolist') {
                let allVideos = [];
                videos.forEach(videoObj => {
                    allVideos = allVideos.concat(videoObj.videolist);
                });
                return new Response(JSON.stringify(allVideos), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else if (url.pathname === '/mockdata') {
                return new Response(JSON.stringify(storagedata), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else {
                return new Response('Not Found', { status: 404, headers: headers });
            }
        } else if (req.method === 'POST') {
            if (url.pathname === '/videos') {
                const newVideo = await req.json();
                newVideo.id = nextVideoId++;
                if (videos.length > 0 && videos[0].videolist) {
                     videos[0].videolist.push(newVideo);
                } else {
                      videos.push({
                           videoname: "New Video Group",
                           videointro: "A new video group",
                           videopicture: "default.jpg",
                           videocount: 1,
                           videolist: [newVideo]
                      });
                }
                await saveVideos();
                return new Response(JSON.stringify(newVideo), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else if (url.pathname === '/newvideogroup') {
                const newVideoGroup = await req.json();
                newVideoGroup.videocount = newVideoGroup.videolist.length;
                newVideoGroup.videolist.forEach(video => {
                    video.id = nextVideoId++;
                });
                videos.push(newVideoGroup);
                await saveVideos();
                return new Response(JSON.stringify(newVideoGroup), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else if (url.pathname === '/movevideos') {
                const { sourceGroupIndex, destGroupIndex, selectedVideos } = await req.json();

                // Remove videos from source group
                videos[sourceGroupIndex].videolist = videos[sourceGroupIndex].videolist.filter(video => !selectedVideos.includes(video.id));

                // Add videos to destination group
                const videosToMove = [];
                selectedVideos.forEach(videoId => {
                    const videoIndex = videos[sourceGroupIndex].videolist.findIndex(video => video.id === videoId);
                    if (videoIndex !== -1) {
                        const video = videos[sourceGroupIndex].videolist[videoIndex];
                        videosToMove.push(video);
                    }
                });
                videos[destGroupIndex].videolist = videos[destGroupIndex].videolist.concat(videosToMove);

                await saveVideos();
                return new Response(null, {
                    status: 200,
                    headers: headers
                });
            } else if (url.pathname === '/savevideodetails') {
                const { url: videoUrl, snapshot, summary } = await req.json();

                // Basic validation
                if (!videoUrl || !snapshot || !summary) {
                    return new Response('Missing required fields', {
                        status: 400,
                        headers: headers
                    });
                }

                // Create a new video object
                const newVideo = {
                    id: nextVideoId++,
                    url: videoUrl,
                    snapshot: snapshot,
                    summary: summary
                };
                if (videos.length > 0 && videos[0].videolist) {
                       videos[0].videolist.push(newVideo);
                  } else {
                        videos.push({
                             videoname: "New Video Group",
                             videointro: "A new video group",
                             videopicture: "default.jpg",
                             videocount: 1,
                             videolist: [newVideo]
                        });
                  }

                await saveVideos();
                return new Response(JSON.stringify(newVideo), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else if (url.pathname.endsWith("/postselecteddata")) {
                const selectedData = await req.json();
                storagedata = selectedData;
                console.log('Received selected data:', selectedData);
                return new Response('Data posted successfully!', {
                    status: 200,
                    headers: headers
                });
            } else if (url.pathname === '/saveselecteddata') {
                const selectedData = await req.json();
                storagedata = selectedData;
                await saveStorages();
                return new Response('Data saved successfully!', {
                    status: 200,
                    headers: headers
                });
            }
            else {
                return new Response('Not Found', { status: 404, headers: headers });
            }
        } else if (req.method === 'PUT') {
            if (url.pathname.startsWith('/videos/')) {
                const id = parseInt(url.pathname.split('/')[2]);
                const updatedVideo = await req.json();
                videos[0].videolist = videos[0].videolist.map(video => video.id === id ? updatedVideo : video);
                await saveVideos();
                return new Response(JSON.stringify(updatedVideo), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json', ...headers }
                });
            } else {
                return new Response('Not Found', { status: 404, headers: headers });
            }
        } else if (req.method === 'DELETE') {
            if (url.pathname.startsWith('/videos/')) {
                const id = parseInt(url.pathname.split('/')[2]);
                videos[0].videolist = videos[0].videolist.filter(video => video.id !== id);
                await saveVideos();
                return new Response(null, {
                    status: 204,
                    headers: headers
                });
            } else if (url.pathname.startsWith('/deletevideogroup/')) {
                const id = parseInt(url.pathname.split('/')[2]);
                videos = videos.filter((group, index) => index !== id);
                await saveVideos();
                return new Response(null, {
                    status: 204,
                    headers: headers
                });
            } else {
                return new Response('Not Found', { status: 404, headers: headers });
            }
        } else {
            return new Response('Method Not Allowed', { status: 405, headers: headers });
        }
    } catch (error: any) {
        console.error("API processing error:", error);
        return new Response('Internal Server Error', { status: 500, headers: headers });
    }
}
