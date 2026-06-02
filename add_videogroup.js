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

        videos.forEach(video => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = video.id;
            checkbox.name = 'selectedVideos';
            checkbox.value = video.id;

            const label = document.createElement('label');
            label.htmlFor = video.id;
            label.textContent = video.title;

            const br = document.createElement('br');

            selectVideosForm.appendChild(checkbox);
            selectVideosForm.appendChild(label);
            selectVideosForm.appendChild(br);
        });
    }

    function populateExistingVideoGroups(videoGroups) {
        const existingVideoGroupsContainer = document.getElementById('existingVideoGroups');
        existingVideoGroupsContainer.innerHTML = '';

        videoGroups.forEach((group, index) => {
            const groupDiv = document.createElement('div');
            groupDiv.innerHTML = `
                <h3>${group.videoname}</h3>
                <p>${group.videointro}</p>
                <img src="${group.videopicture}" alt="${group.videoname}" width="100">
                <button onclick="deleteVideoGroup(${index})">Delete</button>
            `;
            existingVideoGroupsContainer.appendChild(groupDiv);
        });
    }

    window.deleteVideoGroup = function(index) {
        authFetch('/deletevideogroup/' + index, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                alert('Video group deleted successfully!');
                authFetch('/videolist')
                    .then(response => response.json())
                    .then(data => {
                        existingVideoGroups = data;
                        populateExistingVideoGroups(existingVideoGroups);
                    });
            } else {
                alert('Error deleting video group.');
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
                alert('Video group created successfully!');
                authFetch('/videolist')
                    .then(response => response.json())
                    .then(data => {
                        existingVideoGroups = data;
                        populateExistingVideoGroups(existingVideoGroups);
                    });
            } else {
                alert('Error creating video group.');
            }
        });
    }
});
