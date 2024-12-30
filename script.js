document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const convertButton = document.getElementById('convertButton');
    const outputImageContainer = document.getElementById('outputImageContainer');
    const loadingElement = document.getElementById('loading');
    const errorElement = document.getElementById('error');

    // 添加设置控件的引用
    const noiseStrength = document.getElementById('noiseStrength');
    const lineCount = document.getElementById('lineCount');
    const lineOpacity = document.getElementById('lineOpacity');
    const distortionStrength = document.getElementById('distortionStrength');
    const distortionFrequency = document.getElementById('distortionFrequency');
    
    // Advanced 按钮控制
    const advancedBtn = document.getElementById('advancedBtn');
    const settingsPanel = document.querySelector('.settings-panel');
    
    advancedBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
        advancedBtn.textContent = settingsPanel.classList.contains('hidden') ? 
            'Advanced ▼' : 'Advanced ▲';
    });
    
    // 点击外部关闭设置面板
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !advancedBtn.contains(e.target)) {
            settingsPanel.classList.add('hidden');
            advancedBtn.textContent = 'Advanced ▼';
        }
    });

    // 添加实时更新显示值的功能
    const updateValue = (input) => {
        const display = input.parentElement.querySelector('.value-display');
        if (input.id === 'lineOpacity') {
            display.textContent = (input.value / 100).toFixed(2);
        } else {
            display.textContent = input.value;
        }
    };
    
    // 为所有范围输入添加更新事件
    [noiseStrength, lineCount, lineOpacity, distortionStrength, distortionFrequency].forEach(input => {
        input.addEventListener('input', () => updateValue(input));
    });

    // Error handler function
    const showError = (message) => {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => errorElement.classList.add('hidden'), 3000);
    };

    /**
     * 将Markdown文本转换为HTML
     * @param {string} markdown 
     * @returns {string} html
     */
    async function markdownToHtml(markdown) {
        console.log("开始转换Markdown到HTML...");
        const htmlContent = marked.parse(markdown);
        const styledHtml = `<div class="markdown-content">${htmlContent}</div>`;
        console.log("Markdown转换完成");
        return styledHtml;
    }

    /**
     * 计算内容高度并调整容器
     * @param {HTMLElement} element 
     */
    function adjustHeight(element) {
        const content = element.querySelector('.paper');
        if (content) {
            const height = content.scrollHeight;
            element.style.height = `${height + 40}px`; // 添加一些内边距
        }
    }

    /**
     * 计算文本在容器中的高度
     * @param {HTMLElement} container 
     * @param {string} html 
     * @returns {number}
     */
    function calculateContentHeight(container, html) {
        const testDiv = document.createElement('div');
        testDiv.innerHTML = html;
        testDiv.style.cssText = window.getComputedStyle(container).cssText;
        testDiv.style.position = 'absolute';
        testDiv.style.visibility = 'hidden';
        document.body.appendChild(testDiv);
        const height = testDiv.offsetHeight;
        document.body.removeChild(testDiv);
        return height;
    }

    /**
     * 将长文本分割成多个页面
     * @param {string} html 
     * @returns {string[]}
     */
    async function splitIntoPages(html) {
        const maxHeight = 720; // 考虑内边距后的可用高度
        const pages = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const elements = Array.from(doc.body.children);
        
        let currentPage = '';
        let currentHeight = 0;
        
        for (const element of elements) {
            const elementHtml = element.outerHTML;
            const testContainer = document.createElement('div');
            testContainer.className = 'paper';
            const elementHeight = calculateContentHeight(testContainer, elementHtml);
            
            if (currentHeight + elementHeight > maxHeight) {
                if (currentPage) {
                    pages.push(currentPage);
                }
                currentPage = elementHtml;
                currentHeight = elementHeight;
            } else {
                currentPage += elementHtml;
                currentHeight += elementHeight;
            }
        }
        
        if (currentPage) {
            pages.push(currentPage);
        }
        
        return pages;
    }

    /**
     * 将HTML转换为图像
     * @param {string} html 
     */
    async function convertHtmlToImage(html) {
        console.log("开始转换HTML到图像...");
        if (currentMode === 'xiaohongshu') {
            const pages = XHSMode.splitPages(html);
            const images = await Promise.all(
                pages.map(page => XHSMode.generateImage(page))
            );
            XHSMode.showPreview(images, outputImageContainer);
            return;
        }

        const hiddenDiv = document.getElementById('hiddenHtml');
        hiddenDiv.className = currentMode;
        hiddenDiv.innerHTML = `<div class="paper">${html}</div>`;

        // 获取实际内容的尺寸
        const paper = hiddenDiv.querySelector('.paper');
        const paperWidth = currentMode === 'horizontal' ? 800 : 400;
        const paperHeight = paper.scrollHeight;
        
        // 计算外部容器尺寸（添加边距）
        const margin = 20;  // 统一设置边距为20px
        const containerWidth = paperWidth + (margin * 2);  // 两侧边距
        const containerHeight = paperHeight + (margin * 2);  // 上下边距

        try {
            const canvas = await html2canvas(hiddenDiv, {
                useCORS: true,
                logging: true,
                scale: 2,
                width: containerWidth,
                height: containerHeight,
                backgroundColor: '#E3F2FD',
                onclone: function(clonedDoc) {
                    const clonedDiv = clonedDoc.getElementById('hiddenHtml');
                    clonedDiv.style.visibility = 'visible';
                    clonedDiv.style.position = 'absolute';
                    clonedDiv.style.top = '0';
                    clonedDiv.style.left = '0';
                    // 确保克隆的元素也使用正确的尺寸
                    clonedDiv.style.width = containerWidth + 'px';
                    clonedDiv.style.height = containerHeight + 'px';
                    // 确保内容居中
                    const paperDiv = clonedDiv.querySelector('.paper');
                    paperDiv.style.width = paperWidth + 'px';
                    paperDiv.style.margin = `${margin}px`;
                }
            });

            const finalCanvas = document.createElement('canvas');
            const ctx = finalCanvas.getContext('2d');
            finalCanvas.width = canvas.width;
            finalCanvas.height = canvas.height;
            
            // 绘制原始内容
            ctx.drawImage(canvas, 0, 0);
            
            // 添加随机细微噪点
            const imageData = ctx.getImageData(0, 0, finalCanvas.width, finalCanvas.height);
            const pixels = imageData.data;
            const noise = noiseStrength.value / 2; // 将范围值除以2以获得合适的噪点强度
            
            for (let i = 0; i < pixels.length; i += 4) {
                const randomNoise = Math.random() * noise - (noise / 2);
                pixels[i] = Math.min(255, Math.max(0, pixels[i] + randomNoise));     // R
                pixels[i+1] = Math.min(255, Math.max(0, pixels[i+1] + randomNoise)); // G
                pixels[i+2] = Math.min(255, Math.max(0, pixels[i+2] + randomNoise)); // B
            }
            ctx.putImageData(imageData, 0, 0);

            // 添加随机细线
            ctx.strokeStyle = `rgba(0,0,0,${lineOpacity.value / 100})`;
            ctx.lineWidth = 0.5;
            const lines = parseInt(lineCount.value);
            for (let i = 0; i < lines; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * finalCanvas.width, Math.random() * finalCanvas.height);
                ctx.lineTo(Math.random() * finalCanvas.width, Math.random() * finalCanvas.height);
                ctx.stroke();
            }

            // 添加波纹扭曲效果
            const distortionCanvas = document.createElement('canvas');
            const distortionCtx = distortionCanvas.getContext('2d');
            distortionCanvas.width = finalCanvas.width;
            distortionCanvas.height = finalCanvas.height;
            distortionCtx.drawImage(finalCanvas, 0, 0);

            const strength = parseFloat(distortionStrength.value);
            const frequency = parseFloat(distortionFrequency.value);
            
            ctx.clearRect(0, 0, finalCanvas.width, finalCanvas.height);
            
            for (let y = 0; y < finalCanvas.height; y++) {
                const offset = Math.sin(y * frequency) * strength;
                ctx.drawImage(
                    distortionCanvas, 
                    0, y, finalCanvas.width, 1,
                    offset, y, finalCanvas.width, 1
                );
            }

            const dataURL = finalCanvas.toDataURL('image/png');
            displayImage(dataURL);
            console.log("HTML到图像转换完成");
        } catch (error) {
            showError('生成图像时出错：' + error.message);
            console.error(error);
        }
    }

    /**
     * 显示生成的图像
     * @param {string} imageUrl 
     */
    function displayImage(imageUrl) {
        outputImageContainer.innerHTML = '';
        if (Array.isArray(imageUrl)) {
            // 创建小红书模式的容器
            const container = document.createElement('div');
            container.className = 'xiaohongshu-container';
            
            // 创建页码指示器
            const indicator = document.createElement('div');
            indicator.className = 'page-indicator';
            
            // 添加所有图片和页码点
            imageUrl.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `第 ${index + 1} 页`;
                container.appendChild(img);
                
                const dot = document.createElement('div');
                dot.className = `page-dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    container.scrollTo({
                        left: img.offsetLeft - container.offsetLeft,
                        behavior: 'smooth'
                    });
                });
                indicator.appendChild(dot);
            });
            
            outputImageContainer.appendChild(container);
            outputImageContainer.appendChild(indicator);
            
            // 监听滚动更新页码指示器
            container.addEventListener('scroll', () => {
                const dots = indicator.querySelectorAll('.page-dot');
                const imgs = container.querySelectorAll('img');
                const scrollLeft = container.scrollLeft;
                
                imgs.forEach((img, index) => {
                    if (Math.abs(img.offsetLeft - scrollLeft) < img.width / 2) {
                        dots.forEach(dot => dot.classList.remove('active'));
                        dots[index].classList.add('active');
                    }
                });
            });
        } else {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = '生成的文本图像';
            outputImageContainer.appendChild(img);
        }

        // 添加下载按钮
        const downloadBtn = document.createElement('a');
        downloadBtn.href = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
        downloadBtn.download = 'text-image.png';
        downloadBtn.textContent = '下载图像';
        downloadBtn.className = 'download-btn';
        outputImageContainer.appendChild(downloadBtn);
    }

    // 输出模式控制
    const outputModeBtn = document.getElementById('outputModeBtn');
    const modePanel = document.querySelector('.mode-panel');
    const modeOptions = document.querySelectorAll('.mode-option');
    let currentMode = 'vertical'; // 默认垂直模式
    
    // 更新按钮文本显示当前模式
    const updateModeBtnText = () => {
        let modeText;
        switch(currentMode) {
            case 'vertical':
                modeText = '手机模式 📱';
                break;
            case 'horizontal':
                modeText = '电脑模式 🖥️';
                break;
            case 'xiaohongshu':
                modeText = '小红书模式 📖';
                break;
            default:
                modeText = '手机模式 📱';
        }
        outputModeBtn.textContent = `${modeText} ▼`;
    };
    
    // 初始化显示
    updateModeBtnText();
    
    // 初始化时设置默认选中的模式选项
    document.querySelector('.mode-option[data-mode="vertical"]').classList.add('active');
    
    // 模式选择按钮点击事件
    outputModeBtn.addEventListener('click', () => {
        modePanel.classList.toggle('hidden');
        outputModeBtn.textContent = outputModeBtn.textContent.includes('▼') ? 
            outputModeBtn.textContent.replace('▼', '▲') : 
            outputModeBtn.textContent.replace('▲', '▼');
    });
    
    // 模式选项点击事件
    modeOptions.forEach(option => {
        option.addEventListener('click', () => {
            currentMode = option.dataset.mode;
            modeOptions.forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            updateModeBtnText();
            modePanel.classList.add('hidden');
        });
    });
    
    // 点击外部关闭模式面板
    document.addEventListener('click', (e) => {
        if (!modePanel.contains(e.target) && !outputModeBtn.contains(e.target)) {
            modePanel.classList.add('hidden');
            outputModeBtn.textContent = outputModeBtn.textContent.replace('▲', '▼');
        }
    });

    // 监听转换按钮点击事件
    convertButton.addEventListener('click', async function() {
        try {
            const text = inputText.value;
            if (text.trim() === '') {
                showError('请输入要转换的文本。');
                return;
            }

            // 显示加载状态
            loadingElement.classList.remove('hidden');
            convertButton.disabled = true;

            // 统一使用Markdown渲染路径
            const html = await markdownToHtml(text);
            await convertHtmlToImage(html);
        } catch (error) {
            showError('转换文本为图像时出错：' + error.message);
            console.error(error);
        } finally {
            loadingElement.classList.add('hidden');
            convertButton.disabled = false;
        }
    });

    // 小红书模式的独立实现
    const XHSMode = {
        init() {
            // 创建小红书专用的隐藏容器
            const container = document.createElement('div');
            container.id = 'xhsContainer';
            container.className = 'xhs-container';
            document.body.appendChild(container);
        },

        /**
         * 计算内容高度
         * @param {string} html 
         * @returns {number}
         */
        calculateHeight(html) {
            const div = document.createElement('div');
            div.className = 'xhs-paper';
            div.innerHTML = html;
            div.style.position = 'absolute';
            div.style.visibility = 'hidden';
            document.body.appendChild(div);
            const height = div.scrollHeight;
            document.body.removeChild(div);
            return height;
        },

        /**
         * 分页处理
         * @param {string} html 
         * @returns {string[]}
         */
        splitPages(html) {
            const maxHeight = 720;
            const pages = [];
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const elements = Array.from(doc.body.children);
            
            let currentPage = '';
            let currentHeight = 0;
            
            for (const element of elements) {
                const elementHtml = element.outerHTML;
                const elementHeight = this.calculateHeight(elementHtml);
                
                if (currentHeight + elementHeight > maxHeight) {
                    if (currentPage) pages.push(currentPage);
                    currentPage = elementHtml;
                    currentHeight = elementHeight;
                } else {
                    currentPage += elementHtml;
                    currentHeight += elementHeight;
                }
            }
            
            if (currentPage) pages.push(currentPage);
            return pages;
        },

        /**
         * 生成图片
         * @param {string} html 
         * @returns {Promise<string>}
         */
        async generateImage(html) {
            const container = document.getElementById('xhsContainer');
            container.innerHTML = `<div class="xhs-paper">${html}</div>`;

            try {
                const canvas = await html2canvas(container, {
                    width: 440,
                    height: 840,
                    scale: 2,
                    backgroundColor: '#E3F2FD',
                    logging: false,
                });
                return canvas.toDataURL('image/png');
            } finally {
                container.innerHTML = '';
            }
        },

        /**
         * 显示预览
         * @param {string[]} images 
         * @param {HTMLElement} container 
         */
        showPreview(images, container) {
            const preview = document.createElement('div');
            preview.className = 'xhs-preview';

            const indicator = document.createElement('div');
            indicator.className = 'xhs-indicator';

            images.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `第 ${index + 1} 页`;
                preview.appendChild(img);

                const dot = document.createElement('div');
                dot.className = `xhs-dot ${index === 0 ? 'active' : ''}`;
                dot.addEventListener('click', () => {
                    preview.scrollTo({
                        left: img.offsetLeft,
                        behavior: 'smooth'
                    });
                });
                indicator.appendChild(dot);
            });

            preview.addEventListener('scroll', () => {
                const scrollLeft = preview.scrollLeft;
                const dots = indicator.querySelectorAll('.xhs-dot');
                preview.querySelectorAll('img').forEach((img, index) => {
                    if (Math.abs(img.offsetLeft - scrollLeft) < img.width / 2) {
                        dots.forEach(dot => dot.classList.remove('active'));
                        dots[index].classList.add('active');
                    }
                });
            });

            container.innerHTML = '';
            container.appendChild(preview);
            container.appendChild(indicator);
        }
    };

    // 初始化小红书模式
    document.addEventListener('DOMContentLoaded', () => {
        XHSMode.init();
    });
});
