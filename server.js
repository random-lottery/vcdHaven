const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Load videos from videos.json
let videos = [];
let storagedata = [];
let nextVideoId = 1;
try {
    const data = fs.readFileSync('videos.json', 'utf8');
    const videoData = JSON.parse(data);
    videos = videoData;

    // Find the maximum video ID
    videos.forEach(group => {
        group.videolist.forEach(video => {
            const videoId = parseInt(video.id);
            if (!isNaN(videoId) && videoId >= nextVideoId) {
                nextVideoId = videoId + 1;
            }
        });
    });
} catch (err) {
    console.error('Error reading videos.json:', err);
}

// Save videos to videos.json
const saveVideos = () => {
    fs.writeFileSync('videos.json', JSON.stringify(videos, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing videos.json:', err);
        }
    });
};

// Get all videos
app.get('/videos', (req, res) => {
    let allVideos = [];
    videos.forEach(videoObj => {
        allVideos = allVideos.concat(videoObj.videolist);
    });
    res.json(allVideos);
});

// Add a new video
app.post('/videos', (req, res) => {
    const newVideo = req.body;
    newVideo.id = nextVideoId++;
    videos[0].videolist.push(newVideo);
    saveVideos();
    res.status(201).json(newVideo);
});

// Update a video
app.put('/videos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const updatedVideo = req.body;
    videos[0].videolist = videos[0].videolist.map(video => video.id === id ? updatedVideo : video);
    saveVideos();
    res.json(updatedVideo);
});

// Delete a video
app.delete('/videos/:id', (req, res) => {
    const id = parseInt(req.params.id);
    videos[0].videolist = videos[0].videolist.filter(video => video.id !== id);
    saveVideos();
    res.status(204).send();
});

// Add a new video group
app.post('/newvideogroup', (req, res) => {
    const newVideoGroup = req.body;
    newVideoGroup.videocount = newVideoGroup.videolist.length;
    newVideoGroup.videolist.forEach(video => {
        video.id = nextVideoId++;
    });
    videos.push(newVideoGroup);
    saveVideos();
    res.status(201).json(newVideoGroup);
});

// Delete a video group
app.delete('/deletevideogroup/:id', (req, res) => {
    const id = parseInt(req.params.id);
    videos = videos.filter((group, index) => index !== id);
    saveVideos();
    res.status(204).send();
});

// Move videos from one group to another
app.post('/movevideos', (req, res) => {
    const { sourceGroupIndex, destGroupIndex, selectedVideos } = req.body;

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

    // Save changes
    saveVideos();
    res.status(200).send();
});

app.post('/savevideodetails', (req, res) => {
    const { url, snapshot, summary } = req.body;

    // Basic validation
    if (!url || !snapshot || !summary) {
        return res.status(400).send('Missing required fields');
    }

    // Create a new video object
    const newVideo = {
        id: nextVideoId++,
        url: url,
        snapshot: snapshot,
        summary: summary
    };

    // Add the new video to the first video group
    if (videos.length > 0 && videos[0].videolist) {
        videos[0].videolist.push(newVideo);
    } else {
        // If there are no video groups, create one
        videos.push({
            videoname: "New Video Group",
            videointro: "A new video group",
            videopicture: "default.jpg",
            videocount: 1,
            videolist: [newVideo]
        });
    }

    // Save changes
    saveVideos();
    res.status(201).json(newVideo);
});

// Get pure video list
app.get('/videolist', (req, res) => {
    let allVideos = [];
    videos.forEach(videoObj => {
        allVideos = allVideos.concat(videoObj.videolist);
    });
    res.json(allVideos);
});

// Mock data endpoint
app.get('/mockdata', (req, res) => {
    const mockData = storagedata;
    res.json(mockData);
});

// Post selected data endpoint
app.post('/postselecteddata', (req, res) => {
    const selectedData = req.body;
    storagdata = selectedData;
    console.log('Received selected data:', selectedData);
    res.status(200).send('Data posted successfully!');
});

// Save selected data endpoint
app.post('/saveselecteddata', (req, res) => {
    const selectedData = req.body;
    storagedata = selectedData;
    fs.writeFileSync('storages.json', JSON.stringify(selectedData, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing storages.json:', err);
            return res.status(500).send('Error saving data.');
        }
        res.status(200).send('Data saved successfully!');
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
