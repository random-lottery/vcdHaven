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
    const id = document.getElementById('selectedVideoId').value;
    if (!id) { alert('Please select a video from the list.'); return; }

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
    const id = document.getElementById('selectedVideoId').value;
    if (!id) { alert('Please select a video from the list.'); return; }
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
    const videoTableBody = document.querySelector('#videoTable tbody');
    videoTableBody.innerHTML = '';

    fetch('/videolist')
        .then(response => response.json())
        .then(data => {
            data.forEach(video => {
                const tr = document.createElement('tr');
                tr.className = 'cursor-pointer hover:bg-blue-50';
                const snapshotSrc = video.snapshot ? video.snapshot : 'https://via.placeholder.com/64x36?text=No+Image';
                tr.innerHTML = `
                    <td class=\"px-4 py-2\"><img src=\"${snapshotSrc}\" alt=\"snapshot\" class=\"w-16 h-9 object-cover rounded\"></td>
                    <td class=\"px-4 py-2\">${video.id}</td>
                    <td class=\"px-4 py-2\">${video.title || ''}</td>
                    <td class=\"px-4 py-2\">${video.url || ''}</td>
                    <td class=\"px-4 py-2\">${video.summary || ''}</td>
                `;
                tr.addEventListener('click', function() {
                    document.getElementById('selectedVideoId').value = video.id;
                    document.getElementById('url').value = video.url || '';
                    document.getElementById('title').value = video.title || '';
                    document.getElementById('videoSummary').value = video.summary || '';
                    // Highlight selected row
                    Array.from(videoTableBody.children).forEach(row => row.classList.remove('bg-blue-100'));
                    tr.classList.add('bg-blue-100');
                });
                videoTableBody.appendChild(tr);
            });
        });
}
