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
    const summary = document.getElementById('videoSummary').value;
    if (!id) { alert('Please select a video from the list.'); return; }

     fetch('/videos/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id:id, url: url, title: title, summary: summary })
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
    video.crossOrigin = 'anonymous';
    video.src = url;
}

function takeSnapshot() {
    const video = document.getElementById('videoPreview');
    const canvas = document.getElementById('videoSnapshot');
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

function compressImage(canvas, maxWidth, maxHeight, quality) {
    // Create a temporary canvas for compression
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    // Calculate new dimensions maintaining aspect ratio
    let width = canvas.width;
    let height = canvas.height;
    
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    
    // Draw the image scaled down
    ctx.drawImage(canvas, 0, 0, width, height);
    
    // Convert to JPEG with compression (JPEG is much smaller than PNG)
    return tempCanvas.toDataURL('image/jpeg', quality);
}

function saveVideoDetails() {
    const id = document.getElementById('selectedVideoId').value;
    const url = document.getElementById('url').value;
    const canvas = document.getElementById('videoSnapshot');
    const summary = document.getElementById('videoSummary').value;

    let snapshot;
    try {
        // Compress the image: max 320x240, quality 0.7 (70%)
        // This should result in a much smaller file size (< 36KB)
        snapshot = compressImage(canvas, 320, 240, 0.7);
        
        // Check if still too large (base64 is ~33% larger than binary)
        // If snapshot is still > 30KB in base64, compress more aggressively
        if (snapshot.length > 30000) {
            snapshot = compressImage(canvas, 240, 180, 0.6);
        }
        if (snapshot.length > 30000) {
            snapshot = compressImage(canvas, 160, 120, 0.5);
        }
    } catch (error) {
        if (error.name === 'SecurityError' || error.message.includes('Tainted canvases')) {
            alert('Cannot export snapshot: Video is from a different origin and CORS is not properly configured. Please ensure the video server allows cross-origin requests.');
            return;
        }
        throw error;
    }

    fetch('/savevideodetails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id:id, url: url, snapshot: snapshot, summary: summary })
    })
    .then(response => {
        if (response.ok) {
            alert('Video details saved successfully!');
        } else {
            response.text().then(text => {
                alert('Error saving video details: ' + text);
            });
        }
    })
    .catch(error => {
        alert('Error saving video details: ' + error.message);
    });
}

function populateVideoData() {
    const videoTableBody = document.querySelector('#videoTable tbody');
    videoTableBody.innerHTML = '';

    fetch('/videos')
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

