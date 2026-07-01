function authFetch(url, options = {}) {
    const headers = window.auth?.getAuthHeaders?.(options.headers || {}) || (options.headers || {});
    return fetch(url, { ...options, headers });
}

function addVideo() {
    const url = document.getElementById('url').value;
    const title = document.getElementById('title').value;

    authFetch('/videos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: url, title: title })
    })
    .then(response => {
        if (response.ok) {
            alert('视频添加成功！');
            populateVideoData();
        } else {
            alert('添加视频失败。');
        }
    });
}

function modifyVideo() {
    const url = document.getElementById('url').value;
    const title = document.getElementById('title').value;
    const id = document.getElementById('selectedVideoId').value;
    const summary = document.getElementById('videoSummary').value;
    if (!id) { alert('请先从列表中选择一条视频。'); return; }

     authFetch('/videos/' + id, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id:id, url: url, title: title, summary: summary })
    })
    .then(response => {
        if (response.ok) {
            alert('视频修改成功！');
        } else {
            alert('修改视频失败。');
        }
    });
}

function deleteVideo() {
    const id = document.getElementById('selectedVideoId').value;
    if (!id) { alert('请先从列表中选择一条视频。'); return; }
     authFetch('/videos/' + id, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            alert('视频删除成功！');
            populateVideoData();
        } else {
            alert('删除视频失败。');
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
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    
    let width = canvas.width;
    let height = canvas.height;
    
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    tempCanvas.width = width;
    tempCanvas.height = height;
    ctx.drawImage(canvas, 0, 0, width, height);
    return tempCanvas.toDataURL('image/jpeg', quality);
}

function saveVideoDetails() {
    const id = document.getElementById('selectedVideoId').value;
    const url = document.getElementById('url').value;
    const canvas = document.getElementById('videoSnapshot');
    const summary = document.getElementById('videoSummary').value;

    let snapshot;
    try {
        snapshot = compressImage(canvas, 320, 240, 0.7);
        if (snapshot.length > 30000) {
            snapshot = compressImage(canvas, 240, 180, 0.6);
        }
        if (snapshot.length > 30000) {
            snapshot = compressImage(canvas, 160, 120, 0.5);
        }
    } catch (error) {
        if (error.name === 'SecurityError' || error.message.includes('Tainted canvases')) {
            alert('无法导出快照：视频来自其他域名，请确保视频服务器已配置 CORS。');
            return;
        }
        throw error;
    }

    authFetch('/savevideodetails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({id:id, url: url, snapshot: snapshot, summary: summary })
    })
    .then(response => {
        if (response.ok) {
            alert('视频详情保存成功！');
        } else {
            response.text().then(text => {
                alert('保存视频详情失败：' + text);
            });
        }
    })
    .catch(error => {
        alert('保存视频详情失败：' + error.message);
    });
}

function populateVideoData() {
    const videoTableBody = document.querySelector('#videoTable tbody');
    videoTableBody.innerHTML = '';

    authFetch('/videos')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load videos');
            return response.json();
        })
        .then(data => {
            data.forEach(video => {
                const tr = document.createElement('tr');
                tr.className = 'cursor-pointer hover:bg-blue-50';
                const snapshotSrc = video.snapshot ? video.snapshot : 'https://via.placeholder.com/64x36?text=无图';
                tr.innerHTML = `
                    <td class="px-3 sm:px-4 py-2"><img src="${snapshotSrc}" alt="缩略图" class="w-16 h-9 object-cover rounded"></td>
                    <td class="px-3 sm:px-4 py-2">${video.id}</td>
                    <td class="px-3 sm:px-4 py-2">${video.title || ''}</td>
                    <td class="px-3 sm:px-4 py-2 hidden sm:table-cell truncate max-w-[200px]">${video.url || ''}</td>
                    <td class="px-3 sm:px-4 py-2 hidden md:table-cell">${video.summary || ''}</td>
                `;
                tr.addEventListener('click', function() {
                    document.getElementById('selectedVideoId').value = video.id;
                    document.getElementById('url').value = video.url || '';
                    document.getElementById('title').value = video.title || '';
                    document.getElementById('videoSummary').value = video.summary || '';
                    Array.from(videoTableBody.children).forEach(row => row.classList.remove('bg-blue-100'));
                    tr.classList.add('bg-blue-100');
                });
                videoTableBody.appendChild(tr);
            });
        })
        .catch(err => console.error(err));
}
