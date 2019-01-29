/* Code modified from its implementation on madebyevan.com/fsm, changed for networks instead of finite state machines */

function Link(a, b) {
	this.nodeA = a;
	this.nodeB = b;
	this.text = '';
	this.lineAngleAdjust = 0; // value to add to textAngle when link is straight line

	// make anchor point relative to the locations of nodeA and nodeB
	this.parallelPart = 0.5; // percentage from nodeA to nodeB
	this.perpendicularPart = 0; // pixels from line between nodeA and nodeB
}

Link.prototype.getAnchorPoint = function() {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	return {
		'x': this.nodeA.x + dx * this.parallelPart - dy * this.perpendicularPart / scale,
		'y': this.nodeA.y + dy * this.parallelPart + dx * this.perpendicularPart / scale
	};
};

Link.prototype.setAnchorPoint = function(x, y) {
	var dx = this.nodeB.x - this.nodeA.x;
	var dy = this.nodeB.y - this.nodeA.y;
	var scale = Math.sqrt(dx * dx + dy * dy);
	this.parallelPart = (dx * (x - this.nodeA.x) + dy * (y - this.nodeA.y)) / (scale * scale);
	this.perpendicularPart = (dx * (y - this.nodeA.y) - dy * (x - this.nodeA.x)) / scale;
	// snap to a straight line
	if(this.parallelPart > 0 && this.parallelPart < 1 && Math.abs(this.perpendicularPart) < snapToPadding) {
		this.lineAngleAdjust = (this.perpendicularPart < 0) * Math.PI;
		this.perpendicularPart = 0;
	}
};

Link.prototype.getEndPointsAndCircle = function() {
	if(this.perpendicularPart == 0) {
		var midX = (this.nodeA.x + this.nodeB.x) / 2;
		var midY = (this.nodeA.y + this.nodeB.y) / 2;
		var start = this.nodeA.closestPointOnNode(midX, midY);
		var end = this.nodeB.closestPointOnNode(midX, midY);
		return {
			'hasCircle': false,
			'startX': start.x,
			'startY': start.y,
			'endX': end.x,
			'endY': end.y,
		};
	}
	var anchor = this.getAnchorPoint();
	var circle = circleFromThreePoints(this.nodeA.x, this.nodeA.y, this.nodeB.x, this.nodeB.y, anchor.x, anchor.y);
	var isReversed = (this.perpendicularPart > 0);
	var reverseScale = isReversed ? 1 : -1;
	var startAngle = Math.atan2(this.nodeA.y - circle.y, this.nodeA.x - circle.x) - reverseScale * nodeRadius / circle.radius;
	var endAngle = Math.atan2(this.nodeB.y - circle.y, this.nodeB.x - circle.x) + reverseScale * nodeRadius / circle.radius;
	var startX = circle.x + circle.radius * Math.cos(startAngle);
	var startY = circle.y + circle.radius * Math.sin(startAngle);
	var endX = circle.x + circle.radius * Math.cos(endAngle);
	var endY = circle.y + circle.radius * Math.sin(endAngle);
	return {
		'hasCircle': true,
		'startX': startX,
		'startY': startY,
		'endX': endX,
		'endY': endY,
		'startAngle': startAngle,
		'endAngle': endAngle,
		'circleX': circle.x,
		'circleY': circle.y,
		'circleRadius': circle.radius,
		'reverseScale': reverseScale,
		'isReversed': isReversed,
	};
};

Link.prototype.draw = function(c) {
	var stuff = this.getEndPointsAndCircle();
	// draw arc
	c.beginPath();
	if(stuff.hasCircle) {
		c.arc(stuff.circleX, stuff.circleY, stuff.circleRadius, stuff.startAngle, stuff.endAngle, stuff.isReversed);
	} else {
		c.moveTo(stuff.startX, stuff.startY);
		c.lineTo(stuff.endX, stuff.endY);
	}
	c.stroke();
	// draw the head of the arrow
	if(stuff.hasCircle) {
		drawArrow(c, stuff.endX, stuff.endY, stuff.endAngle - stuff.reverseScale * (Math.PI / 2));
	} else {
		drawArrow(c, stuff.endX, stuff.endY, Math.atan2(stuff.endY - stuff.startY, stuff.endX - stuff.startX));
	}
	// draw the text
	if(stuff.hasCircle) {
		var startAngle = stuff.startAngle;
		var endAngle = stuff.endAngle;
		if(endAngle < startAngle) {
			endAngle += Math.PI * 2;
		}
		var textAngle = (startAngle + endAngle) / 2 + stuff.isReversed * Math.PI;
		var textX = stuff.circleX + stuff.circleRadius * Math.cos(textAngle);
		var textY = stuff.circleY + stuff.circleRadius * Math.sin(textAngle);
		drawText(c, this.text, textX, textY, textAngle, selectedObject == this);
	} else {
		var textX = (stuff.startX + stuff.endX) / 2;
		var textY = (stuff.startY + stuff.endY) / 2;
		var textAngle = Math.atan2(stuff.endX - stuff.startX, stuff.startY - stuff.endY);
		drawText(c, this.text, textX, textY, textAngle + this.lineAngleAdjust, selectedObject == this);
	}
};

Link.prototype.containsPoint = function(x, y) {
	var stuff = this.getEndPointsAndCircle();
	if(stuff.hasCircle) {
		var dx = x - stuff.circleX;
		var dy = y - stuff.circleY;
		var distance = Math.sqrt(dx*dx + dy*dy) - stuff.circleRadius;
		if(Math.abs(distance) < hitTargetPadding) {
			var angle = Math.atan2(dy, dx);
			var startAngle = stuff.startAngle;
			var endAngle = stuff.endAngle;
			if(stuff.isReversed) {
				var temp = startAngle;
				startAngle = endAngle;
				endAngle = temp;
			}
			if(endAngle < startAngle) {
				endAngle += Math.PI * 2;
			}
			if(angle < startAngle) {
				angle += Math.PI * 2;
			} else if(angle > endAngle) {
				angle -= Math.PI * 2;
			}
			return (angle > startAngle && angle < endAngle);
		}
	} else {
		var dx = stuff.endX - stuff.startX;
		var dy = stuff.endY - stuff.startY;
		var length = Math.sqrt(dx*dx + dy*dy);
		var percent = (dx * (x - stuff.startX) + dy * (y - stuff.startY)) / (length * length);
		var distance = (dx * (y - stuff.startY) - dy * (x - stuff.startX)) / length;
		return (percent > 0 && percent < 1 && Math.abs(distance) < hitTargetPadding);
	}
	return false;
};


/* ############## START NODE ############ */

function Node(x, y) {
	this.x = x;
	this.y = y;
	this.mouseOffsetX = 0;
	this.mouseOffsetY = 0;
	this.isRouter = false;
	this.text = '';
}

Node.prototype.setMouseStart = function(x, y) {
	this.mouseOffsetX = this.x - x;
	this.mouseOffsetY = this.y - y;
};

Node.prototype.setAnchorPoint = function(x, y) {
	this.x = x + this.mouseOffsetX;
	this.y = y + this.mouseOffsetY;
};

var squareScale = .9

Node.prototype.draw = function(c) {
	// draw a subnet
	if(!this.isRouter) {
		c.beginPath()
		c.rect(this.x-squareScale*nodeRadius, this.y-squareScale*nodeRadius, nodeRadius*2*squareScale, nodeRadius*2*squareScale)
		c.stroke()
	}

	// draw the text
	drawText(c, this.text, this.x, this.y, null, selectedObject == this);
	if (this.addressID !== undefined) {
		drawText(c, this.addressID, this.x, this.y + nodeRadius + 15, null, selectedObject == this, false)
	}

	// draw a router
	if(this.isRouter) {
		c.beginPath();
		c.arc(this.x, this.y, nodeRadius, 0, 2 * Math.PI, false);
		c.moveTo(this.x-.6*nodeRadius, this.y-.6*nodeRadius)
		c.lineTo(this.x+.6*nodeRadius, this.y+.6*nodeRadius)
		c.moveTo(this.x-.6*nodeRadius, this.y+.6*nodeRadius)
		c.lineTo(this.x+.6*nodeRadius, this.y-.6*nodeRadius)
		c.stroke();
	}
};

Node.prototype.closestPointOnNode = function(x, y) {
	if (this.isRouter) { // is a circle
		var dx = x - this.x;
		var dy = y - this.y;
		var scale = Math.sqrt(dx * dx + dy * dy);
		return {
			'x': this.x + dx * nodeRadius / scale,
			'y': this.y + dy * nodeRadius / scale,
		};
	}
	else { // is a square
		let xleft = this.x-squareScale*nodeRadius
		let xright = this.x+squareScale*nodeRadius
		let ytop = this.y-squareScale*nodeRadius
		let ybot = this.y+squareScale*nodeRadius
		if (x < xleft) { // left side
			if (y < ytop) { // top left corner
				return {
					'x': xleft,
					'y': ytop
				}
			} else if (y > ybot) {// bot left corner
				return {
					'x': xleft,
					'y': ybot
				}
			} else { // left, but not a corner
				return {
					'x': xleft,
					'y': y
				}
			}
		} else if (x > xright) { // right side
			if (y < ytop) { // top right corner
				return {
					'x': xright,
					'y': ytop
				}
			} else if (y > ybot) {// bot right corner
				return {
					'x': xright,
					'y': ybot
				}
			} else { // right, but not a corner
				return {
					'x': xright,
					'y': y
				}
			}
		} else if (y < ytop) { // top, but not a corner
			return {
				'x': x,
				'y': ytop
			}
		} else { // bot, but not a corner
			return {
				'x': x,
				'y': ybot
			}
		}
	}
};

Node.prototype.containsPoint = function(x, y) {
	return (x - this.x)*(x - this.x) + (y - this.y)*(y - this.y) < nodeRadius*nodeRadius;
};

function TemporaryLink(from, to) {
	this.from = from;
	this.to = to;
}

TemporaryLink.prototype.draw = function(c) {
	// draw the line
	c.beginPath();
	c.moveTo(this.to.x, this.to.y);
	c.lineTo(this.from.x, this.from.y);
	c.stroke();

	// draw the head of the arrow
	drawArrow(c, this.to.x, this.to.y, Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x));
};

function drawArrow(c, x, y, angle) {
	var dx = Math.cos(angle);
	var dy = Math.sin(angle);
	c.beginPath();
	c.moveTo(x, y);
	c.lineTo(x - 8 * dx + 5 * dy, y - 8 * dy - 5 * dx);
	c.lineTo(x - 8 * dx - 5 * dy, y - 8 * dy + 5 * dx);
}

function drawText(c, originalText, x, y, angleOrNull, isSelected, caret=true) {
  var text = originalText
	c.font = '20px "Times New Roman", serif';
	var width = c.measureText(text).width;

	// center the text
	x -= width / 2;

	// position the text intelligently if given an angle
	if(angleOrNull != null) {
		var cos = Math.cos(angleOrNull);
		var sin = Math.sin(angleOrNull);
		var cornerPointX = (width / 2 + 5) * (cos > 0 ? 1 : -1);
		var cornerPointY = (10 + 5) * (sin > 0 ? 1 : -1);
		var slide = sin * Math.pow(Math.abs(sin), 40) * cornerPointX - cos * Math.pow(Math.abs(cos), 10) * cornerPointY;
		x += cornerPointX - sin * slide;
		y += cornerPointY + cos * slide;
	}

	// draw text and caret (round the coordinates so the caret falls on a pixel)
	if('advancedFillText' in c) {
		c.advancedFillText(text, originalText, x + width / 2, y, angleOrNull);
	} else {
		x = Math.round(x);
		y = Math.round(y);
		c.fillText(text, x, y + 6);
		if(isSelected && caretVisible && document.hasFocus() && caret) {
			x += width;
			c.beginPath();
			c.moveTo(x, y - 10);
			c.lineTo(x, y + 10);
			c.stroke();
		}
	}
}

var caretTimer;
var caretVisible = true;

function resetCaret() {
	clearInterval(caretTimer);
	caretTimer = setInterval('caretVisible = !caretVisible; draw()', 500);
	caretVisible = true;
}

var canvas;
var nodeRadius = 30;
var nodes = [];
var links = [];

var cursorVisible = true;
var snapToPadding = 6; // pixels
var hitTargetPadding = 6; // pixels
var selectedObject = null; // either a Link or a Node
var currentLink = null; // a Link
var movingObject = false;
var originalClick;

function drawUsing(c) {
	c.clearRect(0, 0, canvas.width, canvas.height);
	c.save();
	c.translate(0.5, 0.5);

	for(var i = 0; i < nodes.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (nodes[i] == selectedObject) ? 'blue' : 'black';
		nodes[i].draw(c);
	}
	for(var i = 0; i < links.length; i++) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = (links[i] == selectedObject) ? 'blue' : 'black';
		links[i].draw(c);
	}
	if(currentLink != null) {
		c.lineWidth = 1;
		c.fillStyle = c.strokeStyle = 'black';
		currentLink.draw(c);
	}

	c.restore();
}

function draw() {
	drawUsing(canvas.getContext('2d'));
	saveBackup();
}

function selectObject(x, y) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i].containsPoint(x, y)) {
			return nodes[i];
		}
	}
	for(var i = 0; i < links.length; i++) {
		if(links[i].containsPoint(x, y)) {
			return links[i];
		}
	}
	return null;
}

function deleteObject(object) {
	if(object != null) {
		if (object instanceof Node) {
			for(let i = 0 ; i < links.length ; i++) {
				if (links[i].nodeA === object || links[i].nodeB === object) {
					links.splice(i--, 1)
				}
			}
			let index = nodes.indexOf(object);
			if (index > -1) {
				nodes.splice(index, 1);
			}
		} else {
			index = links.indexOf(object) 
			if (index > -1) {
				links.splice(index, 1)
			}
		}
		draw();
	}
}

function snapNode(node) {
	for(var i = 0; i < nodes.length; i++) {
		if(nodes[i] == node) continue;

		if(Math.abs(node.x - nodes[i].x) < snapToPadding) {
			node.x = nodes[i].x;
		}

		if(Math.abs(node.y - nodes[i].y) < snapToPadding) {
			node.y = nodes[i].y;
		}
	}
}

function showNodeInfo(node) {
	if (node.addressID !== undefined) {
    $("#precalculation").hide()
    $("#addressID").text(node.addressID)
    $("#slash").text(node.slash)
    $("#broadcast").text(node.broadcast)
    $("#usable").text(node.usable)
    $("#starting").text(node.starting)
    $("#ending").text(node.ending)
    $("#bits").text(node.bits)
  }
  $("#subnetinfo").modal("show")
}

window.onload = function() {
  canvas = document.getElementById('canvas');
  canvas.width = window.innerWidth*.9
  canvas.height = window.innerHeight*.6
	restoreBackup();
	draw();

	canvas.onmousedown = function(e) {
		$("#context-menu").hide()
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);
		movingObject = false;
		originalClick = mouse;
		if(selectedObject != null) {
			if(shift && selectedObject instanceof Node) {
				currentLink = new TemporaryLink(selectedObject, mouse);
			} else {
				movingObject = true;
				deltaMouseX = deltaMouseY = 0;
				if(selectedObject.setMouseStart) {
					selectedObject.setMouseStart(mouse.x, mouse.y);
				}
			}
			resetCaret();
		} else if(shift) {
			currentLink = new TemporaryLink(mouse, mouse);
		}

		draw();
	};

	canvas.oncontextmenu = (e) => {
		var mouse = crossBrowserRelativeMousePos(e)
		selectedObject = selectObject(mouse.x, mouse.y)
		if(selectedObject instanceof Node) {
			showContextMenu(e.pageX, e.pageY)
		}
	}

	canvas.ondblclick = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);
		selectedObject = selectObject(mouse.x, mouse.y);

		if(selectedObject == null) {
			selectedObject = new Node(mouse.x, mouse.y);
			nodes.push(selectedObject);
			resetCaret();
			draw();
		} else if(selectedObject instanceof Node) {
			showNodeInfo(selectedObject)
		}
	};

	canvas.onmousemove = function(e) {
		var mouse = crossBrowserRelativeMousePos(e);

		if(currentLink != null) {
			var targetNode = selectObject(mouse.x, mouse.y);
			if(!(targetNode instanceof Node)) {
				targetNode = null;
			}

			if(selectedObject == null) {
				if(targetNode != null) {
					currentLink = new TemporaryLink(targetNode, originalClick);
				} else {
					currentLink = new TemporaryLink(originalClick, mouse);
				}
			} else {
				if(targetNode == selectedObject) {
					currentLink = new TemporaryLink(selectedObject, mouse);
				} else if(targetNode != null) {
					currentLink = new Link(selectedObject, targetNode);
				} else {
					currentLink = new TemporaryLink(selectedObject.closestPointOnNode(mouse.x, mouse.y), mouse);
				}
			}
			draw();
		}

		if(movingObject) {
			selectedObject.setAnchorPoint(mouse.x, mouse.y);
			if(selectedObject instanceof Node) {
				snapNode(selectedObject);
			}
			draw();
		}
	};

	canvas.onmouseup = function(e) {
		movingObject = false;

		if(currentLink != null) {
			if(!(currentLink instanceof TemporaryLink)) {
				selectedObject = currentLink;
				links.push(currentLink);
				resetCaret();
			}
			currentLink = null;
			draw();
		}
	};
}

var shift = false;

document.onkeydown = function(e) {
	var key = crossBrowserKey(e);
	if(key == 16) {
		shift = true;
	} else if(key == 8) { // backspace key
		if(selectedObject != null && 'text' in selectedObject) {
      if(selectedObject.text.length == 0) {
        deleteObject(selectedObject)
        selectedObject = null;
				draw();
				return
      }
      selectedObject.text = String(selectedObject.text)
			selectedObject.text = selectedObject.text.substr(0, selectedObject.text.length - 1);
			resetCaret();
			draw();
		}
  }
  if(key == 46 || shift == true && key == 8) { // delete item
		deleteObject()
	}
};

document.onmousedown = (e) => {
	if (e.toElement.tagName !== "CANVAS") {
		selectedObject = null
	}
}

window.addEventListener("contextmenu", e => {
	e.preventDefault();
})

function showContextMenu(mx, my) {
	console.log("show menue")
	$("#context-menu").css({"top": my, "left": mx, "position": "absolute"})
	$("#context-menu").show()
}

document.onkeyup = function(e) {
	var key = crossBrowserKey(e);
	if(key == 16) {
		shift = false;
	}
};

document.onkeypress = function(e) {
	// don't read keystrokes when other things have focus
	var key = crossBrowserKey(e);
	if(key >= 0x20 && key <= 0x7E && !e.metaKey && !e.altKey && !e.ctrlKey && selectedObject != null && 'text' in selectedObject) {
		selectedObject.text += String.fromCharCode(key);
		resetCaret();
		draw();
		return false;
	} 
};

function crossBrowserKey(e) {
	e = e || window.event;
	return e.which || e.keyCode;
}

function crossBrowserElementPos(e) {
	e = e || window.event;
	var obj = e.target || e.srcElement;
	var x = 0, y = 0;
	while(obj.offsetParent) {
		x += obj.offsetLeft;
		y += obj.offsetTop;
		obj = obj.offsetParent;
	}
	return { 'x': x, 'y': y };
}

function crossBrowserMousePos(e) {
	e = e || window.event;
	return {
		'x': e.pageX || e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft,
		'y': e.pageY || e.clientY + document.body.scrollTop + document.documentElement.scrollTop,
	};
}

function crossBrowserRelativeMousePos(e) {
	var element = crossBrowserElementPos(e);
	var mouse = crossBrowserMousePos(e);
	return {
		'x': mouse.x - element.x,
		'y': mouse.y - element.y
	};
}

function det(a, b, c, d, e, f, g, h, i) {
	return a*e*i + b*f*g + c*d*h - a*f*h - b*d*i - c*e*g;
}

function circleFromThreePoints(x1, y1, x2, y2, x3, y3) {
	var a = det(x1, y1, 1, x2, y2, 1, x3, y3, 1);
	var bx = -det(x1*x1 + y1*y1, y1, 1, x2*x2 + y2*y2, y2, 1, x3*x3 + y3*y3, y3, 1);
	var by = det(x1*x1 + y1*y1, x1, 1, x2*x2 + y2*y2, x2, 1, x3*x3 + y3*y3, x3, 1);
	var c = -det(x1*x1 + y1*y1, x1, y1, x2*x2 + y2*y2, x2, y2, x3*x3 + y3*y3, x3, y3);
	return {
		'x': -bx / (2*a),
		'y': -by / (2*a),
		'radius': Math.sqrt(bx*bx + by*by - 4*a*c) / (2*Math.abs(a))
	};
}

// localstorage backup functions

function restoreBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	try {
		var backup = JSON.parse(localStorage['fsm']);

		for(var i = 0; i < backup.nodes.length; i++) {
			var backupNode = backup.nodes[i];
			var node = new Node(backupNode.x, backupNode.y);
			node.isRouter = backupNode.isRouter;
			node.text = backupNode.text;
			nodes.push(node);
		}
		for(var i = 0; i < backup.links.length; i++) {
			var backupLink = backup.links[i];
			var link = null;
			if(backupLink.type == 'Link') {
				link = new Link(nodes[backupLink.nodeA], nodes[backupLink.nodeB]);
				link.parallelPart = backupLink.parallelPart;
				link.perpendicularPart = backupLink.perpendicularPart;
				link.text = backupLink.text;
				link.lineAngleAdjust = backupLink.lineAngleAdjust;
			}
			if(link != null) {
				links.push(link);
			}
		}
	} catch(e) {
		localStorage['fsm'] = '';
	}
}

function saveBackup() {
	if(!localStorage || !JSON) {
		return;
	}

	var backup = {
		'nodes': [],
		'links': [],
	};
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		var backupNode = {
			'x': node.x,
			'y': node.y,
			'text': node.text,
			'isRouter': node.isRouter,
		};
		backup.nodes.push(backupNode);
	}
	for(var i = 0; i < links.length; i++) {
		var link = links[i];
		var backupLink = null;
		if(link instanceof Link) {
			backupLink = {
				'type': 'Link',
				'nodeA': nodes.indexOf(link.nodeA),
				'nodeB': nodes.indexOf(link.nodeB),
				'text': link.text,
				'lineAngleAdjust': link.lineAngleAdjust,
				'parallelPart': link.parallelPart,
				'perpendicularPart': link.perpendicularPart,
			};
		}
		if(backupLink != null) {
			backup.links.push(backupLink);
		}
	}

	localStorage['fsm'] = JSON.stringify(backup);
}

// VLSM Calculator functions

// converts address to a decimal number and adds the addresses we need to it
function addToAddress(address, add) {
	let decimal = IpSubnetCalculator.toDecimal(address) + add
	let newer = IpSubnetCalculator.toString(decimal)
	return newer
}

// converts node text to numbers so we can use it in the add to address function
function parseNodeText(node) {
  if (node.text === undefined || node.text === NaN || node.text === null || node.text === "") {
		node.text = ""
  } else {
    node.text = parseInt(node.text, 10)
  }
  return node
}

// comparator for the sort function that sorts based on hosts required 
function compareNodes(nodeA, nodeB) {
  if (nodeA.text < nodeB.text) {
    return 1
  } else if (nodeA.text > nodeB.text) {
    return -1
  } else return 0
}

// reducer for calculating out amount of IPs required
reducer = (accumulator, curr) => {
	if (curr.text === "") {
		return accumulator
	} else {
		return accumulator + curr.text + 2
	}
}

$(document).ready(() => {

	// click handler for the context menu
	$("#toggleType").on("click", () => {
		selectedObject.isRouter = !selectedObject.isRouter
		draw()
		$("#context-menu").hide()
	});

	$("#subnetinfobutton").on("click", () => {
		showNodeInfo(selectedObject)
		$("#context-menu").hide()
	})

	$("#deletebutton").on("click", () => {
		deleteObject(selectedObject)
		$("#context-menu").hide()
	})

	// click handler for the calculate VLSM button
  $("#vlsm").click(() => {

    if (!$("#startingAddress").val().includes("/")) {
      alert("Starting Address should be in CIDR format")
    }

		// parses input and calculates needed addresses and max address size
    let starting_address = $("#startingAddress").val().split("/")[0]
    nodes = nodes.map(x => parseNodeText(x))
    let max_addresses = Math.pow(2, (32 - $("#startingAddress").val().split("/")[1]))-2
		let wanted_addresses = nodes.reduce(reducer, 0)
    if (wanted_addresses > max_addresses) {
      $("#sizealert").slideDown()
    }

    nodes = nodes.sort(compareNodes)
		
		// calculates the data we want to display for each node on the canvas
    nodes.forEach((node) => {
			if (!node.isRouter) {
				node.addressID = starting_address
				node.bits = Math.ceil(Math.log2(node.text+2))
				node.addresses = Math.pow(2, node.bits)
				node.usable = node.addresses-2
				node.slash = 32 - node.bits
				node.starting = addToAddress(node.addressID, 1)
				node.broadcast = addToAddress(node.addressID, node.addresses-1)
				node.ending = addToAddress(node.broadcast, -1)
				starting_address = addToAddress(node.broadcast, 1)
			}
		})
		
		
		links.forEach((link) => {
			if (link.nodeA.isRouter && link.nodeB.isRouter) {
				[link.nodeA, link.nodeB].forEach((node) => {
					node.addressID = starting_address
					node.bits = Math.ceil(Math.log2(node.text+2))
					node.addresses = Math.pow(2, node.bits)
					node.usable = node.addresses-2
					node.slash = 32 - node.bits
					node.starting = addToAddress(node.addressID, 1)
					node.broadcast = addToAddress(node.addressID, node.addresses-1)
					node.ending = addToAddress(node.broadcast, -1)
					starting_address = addToAddress(node.broadcast, 1)
				})
			}
		})
    draw()
  })
})

$(function(){
  $('input').focusin(function(){
			$(this).val('')
  });
})