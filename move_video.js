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
                listItem.innerHTML = `<input type="checkbox" value="${video.id}"> ${video.title}`;
                sourceVideoList.appendChild(listItem);
            });
        }

         if (videoGroups[destGroupIndex] && videoGroups[destGroupIndex].videolist) {
            videoGroups[destGroupIndex].videolist.forEach(video => {
                const listItem = document.createElement('li');
                listItem.textContent = video.title;
                destVideoList.appendChild(listItem);
            });
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
                alert('Videos moved successfully!');
                location.reload();
            } else {
                alert('Error moving videos.');
            }
        });
    }

    document.getElementById('sourceGroupSelect').addEventListener('change', populateVideoLists);
    document.getElementById('destGroupSelect').addEventListener('change', populateVideoLists);
});
