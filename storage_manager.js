function authFetch(url, options = {}) {
    const headers = window.auth?.getAuthHeaders?.(options.headers || {}) || (options.headers || {});
    return fetch(url, { ...options, headers });
}

document.addEventListener('DOMContentLoaded', function() {
    let data = [];

    authFetch('/mockdata')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load storage data');
            return response.json();
        })
        .then(mockData => {
            data = mockData;
            populateDataList(data);
        })
        .catch(err => console.error(err));

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

        authFetch('/postselecteddata', {
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

        authFetch('/saveselecteddata', {
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
