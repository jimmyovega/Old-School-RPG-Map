var div,
	imageWidth = 832,
	imageHeight = 1344,
	frameWidth = 64,
	frameHeight = 64,
	curFrame = { x:0,y:0 };

function init(){
	div = document.getElementById('anim');
	loop();
	setInterval(loop,1000/10);
}

function loop(){
	var xOffset = frameWidth * curFrame.x,
	yOffset = frameHeigh * curFrame.y;

	div.style.backgroundPosition = -(xOffset) + "px" + -(yOffset) + "px";

	//Iterate to the next column
	if ((xOffset + frameWidth) < imageWidth) {
		curFrame.x += 1;
	}
	//Else if we can, drop down a row
	else if ((yOffset + frameHeigh) < imageHeight) {
		curFrame.x = 0;
		curFrame.y += 1; 
	}
	//Reset
	else {
		curFrame.x = 0;
		curFrame.y = 0;
	}
}

init();
