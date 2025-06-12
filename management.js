function addVideo() {
    const url = document.getElementById('url').value;
    const title = document.getElementById('title').value;

    fetch('/videos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url, title: title })
    })
    .then(response => {
        if (response.ok) {
            alert('Video added successfully!');
        } else {
            alert('Error adding video.');
        }
    });
}

function modifyVideo() {
    const url = document.getElementById('url').value;
    const title = document.getElementById('title').value;
    const videoListSelect = document.getElementById('videoListSelect');
    const id = videoListSelect.value;

     fetch('/videos/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url, title: title, id:id })
    })
    .then(response => {
        if (response.ok) {
            alert('Video modify successfully!');
        } else {
            alert('Error modify video.');
        }
    });
}

function deleteVideo() {
    const videoListSelect = document.getElementById('videoListSelect');
    const id = videoListSelect.value;
     fetch('/videos/' + id, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            alert('Video delete successfully!');
        } else {
            alert('Error delete video.');
        }
    });
}

function previewVideo() {
    const url = document.getElementById('url').value;
    const video = document.getElementById('videoPreview');
    video.src = url;
}

function takeSnapshot() {
    const video = document.getElementById('videoPreview');
    const canvas = document.getElementById('videoSnapshot');
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function saveVideoDetails() {
    const url = document.getElementById('url').value;
    const snapshot = document.getElementById('videoSnapshot').toDataURL('image/png');
    const summary = document.getElementById('videoSummary').value;

    fetch('/savevideodetails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url, snapshot: snapshot, summary: summary })
    })
    .then(response => {
        if (response.ok) {
            alert('Video details saved successfully!');
        } else {
            alert('Error saving video details.');
        }
    });
}

function populateVideoData() {
    const videoListSelect = document.getElementById('videoListSelect');
    videoListSelect.innerHTML = '';

    fetch('/videolist')
        .then(response => response.json())
        .then(data => {
            data.forEach(video => {
                const option = document.createElement('option');
                option.value = video.id;
                option.text = `${video.title} (${video.url})`;
                videoListSelect.add(option);
            });
        });
}
