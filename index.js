        const carousel = document.querySelector('.carousel');
        const items = document.querySelectorAll('.carousel  li');
        const indicators = document.querySelector('.indicator');
        const thumbItems = document.querySelectorAll('.thumb-item');
        const prevBtn = document.querySelector('.prev');
        const nextBtn = document.querySelector('.next');
        const iframe = document.querySelector('iframe');
        iframe.style.height = window.innerHeight * 0.7 + 'px';
        let currentIndex = 0;
        let interval;
        let videos = [];

        fetch('videos.json')
            .then(response => response.json())
            .then(data => {
                videos = data;
                createThumbnails();
            });

        function createThumbnails() {
            const thumbnailsContainer = document.querySelector('.thumbnails');
            thumbnailsContainer.innerHTML = ''; // Clear existing thumbnails

            videos.forEach((video, index) => {
                const thumbItem = document.createElement('div');
                thumbItem.classList.add('thumb-item');
                thumbItem.dataset.index = index;

                const img = document.createElement('img');
                img.src = video.videopicture;
                img.alt = video.videoname;

                thumbItem.appendChild(img);
                thumbnailsContainer.appendChild(thumbItem);

                thumbItem.addEventListener('click', () => {
                    const groupIndex = parseInt(thumbItem.dataset.index);
                    if (videos[groupIndex] && videos[groupIndex].videolist && videos[groupIndex].videolist.length > 0) {
                        const videoUrl = videos[groupIndex].videolist[0].url;
                        document.querySelector('iframe').src = `dplayer.html?url=${videoUrl}&cover=${videos.videopicture}`;
                    }
                });
            });
        }
        // 初始化指示点
        items.forEach((item, index) => {
            const dot = document.createElement('span');
            dot.addEventListener('click', () => changeSlide(index));
            indicators.appendChild(dot);
        });
 
        // 自动播放 
        function startAutoPlay() {
            interval = setInterval(() => {
                currentIndex = (currentIndex + 1) % items.length; 
                updateSlide();
            }, 3000);
        }
 
        // 缩略图点击事件 
        thumbItems.forEach(thumb  => {
            thumb.addEventListener('click',  () => {
                const index = parseInt(thumb.dataset.index); 
                currentIndex = index;
                updateSlide();
                updateThumbnails();
            });
        });
 
        // 更新缩略图状态 
        function updateThumbnails() {
            thumbItems.forEach((thumb,  index) => {
                thumb.classList.toggle('active',  index === currentIndex);
                // 自动滚动到可视区域 
                if(index === currentIndex) {
                    thumb.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                }
            });
        }
 
        // 更新当前显示的幻灯片 
        function updateSlide() {
            carousel.style.transform  = `translateX(-${currentIndex * 100}%)`;
            updateIndicator();
        // 在原有 updateSlide 函数末尾添加 
        updateThumbnails();
        }
 
        // 更新指示点状态 
        function updateIndicator() {
            indicators.querySelectorAll('span').forEach((dot,  index) => {
                dot.classList.toggle('active',  index === currentIndex);
            });
        }
 
        // 切换幻灯片 
        function changeSlide(index) {
            currentIndex = index;
            updateSlide();
        }
 
        // 暂停/恢复 
        document.querySelector('.carousel-container').addEventListener('mouseenter',  () => clearInterval(interval));
        document.querySelector('.carousel-container').addEventListener('mouseleave',  startAutoPlay);
 
        // 按钮点击事件 
        prevBtn.addEventListener('click',  () => {
            currentIndex = (currentIndex - 1 + items.length)  % items.length; 
            updateSlide();
        });
 
        nextBtn.addEventListener('click',  () => {
            currentIndex = (currentIndex + 1) % items.length; 
            updateSlide();
        });

        // 移动端菜单切换功能
        document.getElementById('mobile-menu-button').addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // 初始化 
        startAutoPlay();
        updateIndicator();
