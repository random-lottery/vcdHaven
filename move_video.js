function authFetch(url, options = {}) {
    const headers = window.auth?.getAuthHeaders?.(options.headers || {}) || (options.headers || {});
    return fetch(url, { ...options, headers });
}

document.addEventListener('DOMContentLoaded', function() {
    let videoGroups = [];

    authFetch('/videolist')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load video groups');
            return response.json();
        })
        .then(data => {
            videoGroups = data;
            populateGroupSelects(videoGroups);
            populateVideoLists();
        })
        .catch(err => console.error(err));

    function populateGroupSelects(videoGroups) {
        const sourceGroupSelect = document.getElementById('sourceGroupSelect');
        const destGroupSelect = document.getElementById('destGroupSelect');

        videoGroups.forEach((group, index) => {
            const option1 = document.createElement('option');
            option1.value = index;
            option1.textContent = group.videoname;
            sourceGroupSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = index;
            option2.textContent = group.videoname;
            destGroupSelect.appendChild(option2);
        });
    }

    function populateVideoLists() {
        const sourceGroupSelect = document.getElementById('sourceGroupSelect');
        const destGroupSelect = document.getElementById('destGroupSelect');
        const sourceVideoList = document.getElementById('sourceVideoList');
        const destVideoList = document.getElementById('destVideoList');

        const sourceGroupIndex = sourceGroupSelect.value;
        const destGroupIndex = destGroupSelect.value;

        sourceVideoList.innerHTML = '';
        destVideoList.innerHTML = '';

        if (videoGroups[sourceGroupIndex] && videoGroups[sourceGroupIndex].videolist) {
            videoGroups[sourceGroupIndex].videolist.forEach(video => {
                const listItem = document.createElement('li');
                listItem.className = 'flex items-center gap-2 p-2 rounded-md hover:bg-white text-sm';
                listItem.innerHTML = `<input type="checkbox" value="${video.id}" class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"> <span>${video.title || '未命名'}</span>`;
                sourceVideoList.appendChild(listItem);
            });
        } else {
            sourceVideoList.innerHTML = '<li class="text-gray-400 text-sm p-2">暂无视频</li>';
        }

         if (videoGroups[destGroupIndex] && videoGroups[destGroupIndex].videolist) {
            videoGroups[destGroupIndex].videolist.forEach(video => {
                const listItem = document.createElement('li');
                listItem.className = 'p-2 text-sm text-gray-700 rounded-md hover:bg-white';
                listItem.textContent = video.title || '未命名';
                destVideoList.appendChild(listItem);
            });
        } else {
            destVideoList.innerHTML = '<li class="text-gray-400 text-sm p-2">暂无视频</li>';
        }
    }

    window.moveSelectedVideos = function() {
        const sourceGroupSelect = document.getElementById('sourceGroupSelect');
        const destGroupSelect = document.getElementById('destGroupSelect');
        const sourceVideoList = document.getElementById('sourceVideoList');

        const sourceGroupIndex = parseInt(sourceGroupSelect.value);
        const destGroupIndex = parseInt(destGroupSelect.value);

        const selectedVideos = Array.from(sourceVideoList.querySelectorAll('input[type="checkbox"]:checked'))
            .map(checkbox => parseInt(checkbox.value));

        if (selectedVideos.length === 0) {
            alert('请至少选择一个要移动的视频。');
            return;
        }

        authFetch('/movevideos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sourceGroupIndex: sourceGroupIndex,
                destGroupIndex: destGroupIndex,
                selectedVideos: selectedVideos
            })
        })
        .then(response => {
            if (response.ok) {
                alert('视频移动成功！');
                location.reload();
            } else {
                alert('移动视频失败。');
            }
        });
    }

    document.getElementById('sourceGroupSelect').addEventListener('change', populateVideoLists);
    document.getElementById('destGroupSelect').addEventListener('change', populateVideoLists);
});
