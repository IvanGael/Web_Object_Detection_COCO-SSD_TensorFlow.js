let model;
let objectCounts = {};
let graphColors = {};

async function loadModel() {
    model = await cocoSsd.load();
}

function setupFileUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const videoElement = document.getElementById('videoElement');

    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e6f2ff';
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        handleFile(e.dataTransfer.files[0]);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (file && file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                videoElement.src = e.target.result;
                videoElement.onloadedmetadata = () => {
                    videoElement.play();
                    startObjectDetection();
                };
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please upload a valid video file.');
        }
    }
}


function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function updateGraph() {
    const data = [{
        x: Object.keys(objectCounts),
        y: Object.values(objectCounts),
        type: 'bar',
        marker: {
            color: Object.keys(objectCounts).map(key => graphColors[key] || (graphColors[key] = getRandomColor()))
        }
    }];

    const layout = {
        title: 'Objects Counting Distribution',
        font: { size: 10 },
        margin: { t: 30, l: 30, r: 30, b: 30 },
        height: 225,
        width: 600
    };

    // if(Object.keys(objectCounts).length == 0){
    //     document.getElementById('graphContainer').innerHTML = "<div style='text-align: center;'><img src='bar-chart.png' width='50%' height='50%'></div>"
    // } 

    Plotly.newPlot('graphContainer', data, layout);
}

async function startObjectDetection() {
    const videoElement = document.getElementById('videoElement');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const waitingMessage = document.getElementById('waitingMessage');

    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    async function detectFrame() {
        if (videoElement.paused || videoElement.ended) return;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        waitingMessage.style.display = 'block';

        const predictions = await model.detect(videoElement);

        waitingMessage.style.display = 'none';

        // Reset object counts for this frame
        objectCounts = {};

        predictions.forEach(prediction => {
            ctx.beginPath();
            ctx.rect(...prediction.bbox);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'green';
            ctx.fillStyle = 'green';
            ctx.stroke();

            const textWidth = ctx.measureText(`${prediction.class} (${prediction.score.toFixed(2)})`).width;
            ctx.fillRect(prediction.bbox[0], prediction.bbox[1] - 20, textWidth + 8, 20);

            ctx.fillStyle = 'white';
            ctx.fillText(`${prediction.class} (${prediction.score.toFixed(2)})`, prediction.bbox[0] + 4, prediction.bbox[1] - 5);

            // Update object counts
            objectCounts[prediction.class] = (objectCounts[prediction.class] || 0) + 1;
        });

        // Update the graph
        updateGraph();

        requestAnimationFrame(detectFrame);
    }

    detectFrame();
}

document.addEventListener('DOMContentLoaded', () => {
    loadModel();
    setupFileUpload();
});