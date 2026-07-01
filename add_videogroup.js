function authFetch(url, options = {}) {
    const headers = window.auth?.getAuthHeaders?.(options.headers || {}) || (options.headers || {});
    return fetch(url, { ...options, headers });
}

document.addEventListener('DOMContentLoaded', function() {
    let videos = [];
    let existingVideoGroups = [];

    authFetch('/videos')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load videos');
            return response.json();
        })
        .then(data => {
            videos = data;
            populateVideoList(videos);
        })
        .catch(err => console.error(err));

    authFetch('/videolist')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load video groups');
            return response.json();
        })
        .then(data => {
            existingVideoGroups = data;
            populateExistingVideoGroups(existingVideoGroups);
        })
        .catch(err => console.error(err));

    function populateVideoList(videos) {
        const selectVideosForm = document.getElementById('selectVideosForm');
        selectVideosForm.innerHTML = '';

        if (!videos.length) {
            selectVideosForm.innerHTML = '<p class="text-gray-400 text-sm">暂无可用视频</p>';
            return;
        }

        videos.forEach(video => {
            const row = document.createElement('label');
            row.className = 'flex items-center gap-3 p-2 rounded-md hover:bg-white cursor-pointer text-sm';
            row.innerHTML = `
                <input type="checkbox" id="vid-${video.id}" name="selectedVideos" value="${video.id}" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                <span>${video.title || '未命名'} <span class="text-gray-400">(ID: ${video.id})</span></span>`;
            selectVideosForm.appendChild(row);
        });
    }

    function populateExistingVideoGroups(videoGroups) {
        const existingVideoGroupsContainer = document.getElementById('existingVideoGroups');
        existingVideoGroupsContainer.innerHTML = '';

        if (!videoGroups.length) {
            existingVideoGroupsContainer.innerHTML = '<p class="text-gray-400 text-sm col-span-2">暂无视频组</p>';
            return;
        }

        videoGroups.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-sm transition';
            groupDiv.innerHTML = `
                <h3 class="font-semibold text-gray-800 mb-1">${group.videoname || '未命名'}</h3>
                <p class="text-sm text-gray-500 mb-3 line-clamp-2">${group.videointro || '暂无简介'}</p>
                <img src="${group.videopicture || 'https://via.placeholder.com/100x60?text=无封面'}" alt="${group.videoname}" class="w-full h-24 object-cover rounded-md mb-3">
                <p class="text-xs text-gray-400 mb-3">视频数量：${group.videocount ?? (group.videolist?.length || 0)}</p>
                <button type="button" onclick="deleteVideoGroup(${index})" class="inline-flex items-center px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition">
                    <i class="fa fa-trash mr-1"></i>删除
                </button>`;
            existingVideoGroupsContainer.appendChild(groupDiv);
        });
    }

    window.deleteVideoGroup = function(index) {
        authFetch('/deletevideogroup/' + index, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                alert('视频组删除成功！');
                authFetch('/videolist')
                    .then(response => response.json())
                    .then(data => {
                        existingVideoGroups = data;
                        populateExistingVideoGroups(existingVideoGroups);
                    });
            } else {
                alert('删除视频组失败。');
            }
        });
    }

    window.submitSelectedVideos = function() {
        const selectedVideoIds = Array.from(document.querySelectorAll('input[name="selectedVideos"]:checked'))
            .map(checkbox => parseInt(checkbox.value));

        const selectedVideos = videos.filter(video => selectedVideoIds.includes(video.id));

        const videoname = document.getElementById('videoname').value;
        const videointro = document.getElementById('videointro').value;
        const videopicture = document.getElementById('videopicture').value;

        const newVideoGroup = {
            videoname: videoname,
            videointro: videointro,
            videopicture: videopicture,
            videocount: selectedVideos.length,
            videolist: selectedVideos
        };

        authFetch('/newvideogroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newVideoGroup)
        })
        .then(response => {
            if (response.ok) {
                alert('视频组创建成功！');
                authFetch('/videolist')
                    .then(response => response.json())
                    .then(data => {
                        existingVideoGroups = data;
                        populateExistingVideoGroups(existingVideoGroups);
                    });
            } else {
                alert('创建视频组失败。');
            }
        });
    }
});
