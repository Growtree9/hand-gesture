import * as tfjs from "@tensorflow/tfjs";
import * as handpose from "@tensorflow-models/handpose";
import * as fp from 'fingerpose';

import { fingerJoints } from './constants';

// DOM
import dom, { createEl } from './libs/dom';

// alertJs
import alertJs from './libs/alert';

// Styles
import './assets/scss/app.scss';

/* Variables */
const ALERT = new alertJs({ closeByClick: false });

const FPS = 60;

let wrapper;

let ctx;

let video;

/* Development */
const init = () => {
	const at = ALERT.warning('Please enable webcam access :)', {
		stable: true,
	});

	getPermissions()
		.then(stream => {
			// Load wrapper
			wrapper = dom();

			// Load video
			renderVideo(stream);
		})
		.catch((message) => {
			ALERT.error(message, {
				stable: true,
			});
		})
		.finally(() => {
			at.end();
		});
}

const renderVideo = stream => {
	// Load Video webcam
	video = createEl(
		'video',
		{
			width: 640,
			height: 480
		}
	);

	const webcam = createEl('div', { class: 'webcam' }, video);
	video.srcObject = stream;
	video.muted = 1;

	// Append video to .wrapper
	wrapper.append(webcam);

	// Configuration
	video.play();
	video.addEventListener('loadeddata', loadModels);
}

const getLoading = () => {
	return createEl(
		'div',
		{
			class: 'backdrop-loading'
		},
		createEl(
			'div',
			{
				class: 'loader'
			},
			[createEl('div'), createEl('div')]
		)
	);
}

const getCanvas = () => {
	const canvas = createEl('canvas');
	ctx = canvas.getContext('2d');

	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;

	return canvas;
}

const getPermissions = () => {
	return new Promise((done, reject) => {
		try {
			if (navigator && navigator.mediaDevices) {

				navigator.mediaDevices
					.getUserMedia({
						video: true,
					})
					.then(stream => {
						done(stream);
					})
					.catch(e => {
						reject(e.message);
					})

			} else throw new Error("Your browser does not support this feature");
		} catch (e) {
			reject(e.message);
		}
	});
}

const loadModels = () => {
	// Render Loading
	video.parentElement.append(getLoading());

	// Show alert
	const at = ALERT.warning("Loading Models...", {
		stable: true,
	});

	// Load
	handpose.load()
		.then(detect)
		.catch(() => {
			ALERT.error("Sorry, an error occurred", {
				stable: true,
			});
		})
		.finally(() => {
			at.end();
		})
}

const detect = async (net) => {
	const canvas = getCanvas();
	wrapper.append(
		createEl('div', { class: 'webcam' }, canvas)
	);

	video.parentElement.classList.add('hidden');
	video.nextElementSibling.remove();

	setInterval(() => predictions(net, canvas), FPS);
}

const predictions = async (net, canvas) => {
	// Detect
	const hands = await net.estimateHands(video);
	ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

	if (hands.length > 0) {
		const keypoints = hands[0].landmarks;

		// Draw path
		drawPath(keypoints);

		for (let i = 0; i < keypoints.length; i++) {
			const y = keypoints[i][0];
			const x = keypoints[i][1];
			drawPoint(x - 2, y - 2, 3);
		}
	}
}

const drawPath = (landmarks) => {
	const fingers = Object.keys(fingerJoints);

	for (let i = 0; i < fingers.length; i++) {
		const finger = fingers[i];
		const points = fingerJoints[finger].map(idx => landmarks[idx]);

		const region = new Path2D();
		region.moveTo(points[0][0], points[0][1]);
		for (let i = 1; i < points.length; i++) {
			const point = points[i];
			region.lineTo(point[0], point[1]);
		}

		ctx.stroke(region);
	}
}

const drawPoint = (y, x, r) => {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.fill();
}

/* const drawPoint = (landmarks) => {
	for (let i = 0; i < landmarks.length; i++) {
		const y = landmarks[i][0];
		const x = landmarks[i][1];

		ctx.beginPath();

		ctx.arc(x - 2, y - 2, 3, 0, 2 * Math.PI);
		ctx.fillStyle = 'black';

		ctx.fill();
	}
} */

document.addEventListener('DOMContentLoaded', init);