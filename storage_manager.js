document.addEventListener('DOMContentLoaded', function() {
    let data = [];

    // Fetch mock data from server
    fetch('/mockdata')
        .then(response => response.json())
        .then(mockData => {
            data = mockData;
            populateDataList(data);
        });

    function populateDataList(data) {
        const dataList = document.getElementById('dataList');
        dataList.innerHTML = '';

        data.forEach(item => {
            const dataItem = document.createElement('div');
            dataItem.innerHTML = `
                <input type="checkbox" id="${item.id}" value="${item.id}">
                <label for="${item.id}">${item.name} (${item.value})</label><br>
            `;
            dataList.appendChild(dataItem);
        });
    }

    window.postSelectedData = function() {
        const selectedData = getSelectedData();

        fetch('/postselecteddata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedData)
        })
        .then(response => {
            if (response.ok) {
                alert('Data posted successfully!');
            } else {
                alert('Error posting data.');
            }
        });
    }

    window.saveSelectedData = function() {
        const selectedData = getSelectedData();

        fetch('/saveselecteddata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(selectedData)
        })
        .then(response => {
            if (response.ok) {
                alert('Data saved successfully!');
            } else {
                alert('Error saving data.');
            }
        });
    }

    function getSelectedData() {
        const selectedData = [];
        data.forEach(item => {
            const checkbox = document.getElementById(item.id);
            if (checkbox.checked) {
                selectedData.push(item);
            }
        });
        return selectedData;
    }
});
