const videoPlayer = document.getElementById('videoPlayer');
const videoList = document.getElementById('videoList');

// Fetch videos from the server
fetch('http://localhost:3000/videos')
    .then(response => response.json())
    .then(videos => {
        videos.forEach(video => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = video.title;
            a.setAttribute('data-url', video.url);
            li.appendChild(a);
            videoList.appendChild(li);
        });
    });

videoList.addEventListener('click', function(event) {
    if (event.target.tagName === 'A') {
        event.preventDefault();
        const videoUrl = event.target.getAttribute('data-url');
        videoPlayer.src = videoUrl;
        videoPlayer.play();
    }
});
