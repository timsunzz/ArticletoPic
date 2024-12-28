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
     * 将HTML转换为图像
     * @param {string} html 
     */
    async function convertHtmlToImage(html) {
        console.log("开始转换HTML到图像...");
        const hiddenDiv = document.getElementById('hiddenHtml');
        hiddenDiv.className = currentMode;
        hiddenDiv.innerHTML = `<div class="paper">${html}</div>`;

        adjustHeight(hiddenDiv);
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const canvas = await html2canvas(hiddenDiv, {
                useCORS: true,
                logging: true,
                scale: 2,
                width: currentMode === 'horizontal' ? 800 : 400,
                height: hiddenDiv.scrollHeight,
                backgroundColor: '#E3F2FD',  // 生成图片的外层背景色（奶油蓝色）
                onclone: function(clonedDoc) {
                    const clonedDiv = clonedDoc.getElementById('hiddenHtml');
                    clonedDiv.style.visibility = 'visible';
                    clonedDiv.style.position = 'absolute';
                    clonedDiv.style.top = '0';
                    clonedDiv.style.left = '0';
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
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = '生成的文本图像';
        outputImageContainer.appendChild(img);

        // 添加下载按钮
        const downloadBtn = document.createElement('a');
        downloadBtn.href = imageUrl;
        downloadBtn.download = 'text-image.png';
        downloadBtn.textContent = '下载图像';
        downloadBtn.className = 'download-btn';
        outputImageContainer.appendChild(downloadBtn);
    }

    // 输出模式控制
    const outputModeBtn = document.getElementById('outputModeBtn');
    const modePanel = document.querySelector('.mode-panel');
    const modeOptions = document.querySelectorAll('.mode-option');
    let currentMode = 'vertical';
    
    // 更新按钮文本显示当前模式
    const updateModeBtnText = () => {
        const modeText = currentMode === 'vertical' ? '手机模式 📱' : '电脑模式 🖥️';
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
});
