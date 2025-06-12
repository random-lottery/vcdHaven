document.addEventListener('DOMContentLoaded', function() {
    let videoGroups = [];

    // Fetch video groups from videos.json
    fetch('videos.json')
        .then(response => response.json())
        .then(data => {
            videoGroups = data;
            populateGroupSelects(videoGroups);
            populateVideoLists();
        });

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

        // Send move request to server
        fetch('/movevideos', {
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
            } else {
                alert('Error moving videos.');
            }
        });
    }

    document.getElementById('sourceGroupSelect').addEventListener('change', populateVideoLists);
    document.getElementById('destGroupSelect').addEventListener('change', populateVideoLists);
});
