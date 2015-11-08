(function(){

    var size = 75;
    var cols = 8;
    var rows = 10;
    var margin = 75;

    var sector_canvas = document.querySelector("#sector canvas");
    var sector_ctx = sector_canvas.getContext('2d');
    function canvas_touch_start_listener(e) {
        console.log('canvas touch start');
        e.preventDefault();
    }
    function view_system_listener(e) {
        e.preventDefault();
        console.log('view system touch end');
        var touches = e.changedTouches;
        if (touches.length == 1) {
            var x = touches[0].pageX;
            var y = touches[0].pageY;
            fsm.view_system(x, y);
        }
    }
    
    var system_canvas = document.querySelector("#system canvas");
    var system_ctx = system_canvas.getContext('2d');
    function view_location_listener(e) {
        e.preventDefault();
        var touches = e.changedTouches;
        if (touches.length == 1) {
            var x = touches[0].pageX;
            var y = touches[0].pageY;
            fsm.view_location(x, y);
        }
    }
    
    var location_canvas = document.querySelector("#location canvas");
    var location_ctx = location_canvas.getContext('2d');
    function location_back_listener(e) {
        e.preventDefault();
        fsm.back();
    }

    function dist(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    }
    
    // functions from redblobgames.com/grids/hexagons
    function pixel_to_axial(px, py) {
        px -= margin;
        py -= margin;
        var q = px * (2 / (size * 3));
        var r = (-px / 3 + Math.sqrt(3) / 3 * py) / size;
        return { q: q, r: r, px: px, py: py }
    }
    
    function axial_to_cube(input) {
        input.x = input.q;
        input.z = input.r;
        input.y = -input.x-input.z;
        return input;
    }
    
    function cube_round(h) {
        var rx = Math.round(h.x);
        var ry = Math.round(h.y);
        var rz = Math.round(h.z);
        var x_diff = Math.abs(rx - h.x);
        var y_diff = Math.abs(ry - h.y);
        var z_diff = Math.abs(rz - h.z);
        if (x_diff > y_diff && x_diff > z_diff) {
            rx = -ry-rz;
        } else if (y_diff > z_diff) {
            yr = -rx-rz;
        } else {
            rz = -rx-ry;
        }
        h.x = rx;
        h.y = ry;
        h.z = rz;
        return h;
    }
    
    function cube_to_odd_q(c) {
        c.col = c.x;
        c.row = c.z + (c.x - (c.x & 1)) / 2;
        return c;
    }
    
    function odd_q_to_pixel(h) {
        var px = size * (3/2) * h.col + margin;
        var py = size * Math.sqrt(3) * (h.row + 0.5 * (h.col & 1)) + margin;
        return { px: px, py: py };
    }
    
    function two_digit(x) {
        var tens = Math.floor(x / 10);
        var ones = Math.round(x - tens * 10);
        return tens.toString() + ones.toString();
    }
    
    function name(h) {
        var col = h.col;
        var row = h.row;
        return two_digit(col) + two_digit(row);
    }
    
    function draw_hexagon(ctx, p, size) {
        ctx.beginPath();
        ctx.moveTo(p.px + size * 1.00, p.py + size * 0.00);
        ctx.lineTo(p.px + size * 0.50, p.py + size * 0.86);
        ctx.lineTo(p.px - size * 0.50, p.py + size * 0.86);
        ctx.lineTo(p.px - size * 1.00, p.py + size * 0.00);
        ctx.lineTo(p.px - size * 0.50, p.py - size * 0.86);
        ctx.lineTo(p.px + size * 0.50, p.py - size * 0.86);
        ctx.lineTo(p.px + size * 1.00, p.py + size * 0.00);
        ctx.stroke();
    }
    
    function draw_circle(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.stroke();
    }
    
    function draw_disk(ctx, x, y, radius) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    function draw_hexes(ctx) { 
        var row, col;
        ctx.strokeStyle = '#ffffff';
        for (row = 0; row < 10; row++ ) {
            for (col = 0; col < 8; col++ ) {
                var p = odd_q_to_pixel({row: row, col:col});
                draw_hexagon(ctx, p, size);
            }
        }
    }
    
    function centered(ctx, text, x, y) {
        var textWidth = ctx.measureText(text).width;
        ctx.fillText(text, x - textWidth / 2, y);
    }
    
    function centeredTop(ctx, text, x, y) {
        var metrics = ctx.measureText(text);
        // there is no metrics.height element, so this is a fudge
        ctx.fillText(text, x - metrics.width / 2, y + 10); 
    }
    
    // globals
    var current_system = null;
    var current_location = null;
    fsm = StateMachine.create({
	initial: 'sector',
	events: [
	    { name: 'view_system', from: 'sector', to: 'system' },
	    { name: 'back', from: 'system', to: 'sector' },
	    { name: 'view_location', from: 'system', to: 'location' },
	    { name: 'back', from: 'location', to: 'system' },
	],
	callbacks: {
	    onbeforeevent: function (e, from, to) {
		console.log('saw ' + e + ' transitioning ' + from + ' to ' + to );
	    },
	    onenterstate: function (e, from, to) {
                var element = document.getElementById(to)
                if (element) {
		    element.style.display = '';
                }
	    },
	    onleavestate: function (e, from, to) {
                var element = document.getElementById(from)
                if (element) {
		    element.style.display = 'none';
                }
	    },
            onentersector: function (e, from, to) {
                var i, j;

                sector_ctx.clearRect(0, 0, sector_canvas.width, sector_canvas.height);
                sector_ctx.fillStyle = '#000000';
                sector_ctx.fillRect(0, 0, sector_canvas.width, sector_canvas.height);
                sector_ctx.fillStyle = '#ffffff';
                draw_hexes(sector_ctx);
                for (i = 0; i < bodies.length; i++) {
                    var body = bodies[i]
                    var coords = body.Chartloc;
                    var col = parseInt(coords.substring(0, 2));
                    var row = parseInt(coords.substring(2, 4));
                    var h = odd_q_to_pixel({col:col, row:row});
                    centered(sector_ctx, body.System, h.px, h.py - size * 0.7);
                    draw_disk(sector_ctx, h.px, h.py, 10);
                    var ls = body.Locations;
                    for (j = 0; j < ls.length; j++) {
                        draw_disk(sector_ctx, h.px + j*10 + 25, h.py, 3);
                    }
                }
                setTimeout(function () {
                    console.log('something');
                    document.addEventListener('touchstart', canvas_touch_start_listener, false);
                    document.addEventListener('touchend', view_system_listener, false);
                }, 0);
                current_system = null;
                current_location = null;
            },
            onleavesector: function (e, from, to) {
                console.log('leaving sector');
                document.removeEventListener('touchstart', canvas_touch_start_listener, false);
                document.removeEventListener('touchend', view_system_listener, false);
            },
            onbeforeview_system: function (e, from, to, x, y) {
                var body = cube_to_odd_q(cube_round(axial_to_cube(pixel_to_axial(x, y))));
                if (body.col >= 0 && body.col < cols && body.row >= 0 && body.row < rows) {
                    for (i = 0; i < bodies.length; i++) {
                        if (name(body) == bodies[i].Chartloc) {
                            current_system = bodies[i];
                            return true;
                        }
                    }
                }
                return false;
            },
            onentersystem: function (e, from, to, x, y) {
                system_ctx.clearRect(0, 0, system_canvas.width, system_canvas.height);
                system_ctx.fillStyle = '#000000';
                system_ctx.fillRect(0, 0, system_canvas.width, system_canvas.height);
                system_ctx.fillStyle = '#ffffff';
                var star = {
                    px: system_canvas.width / 2,
                    py: system_canvas.height * 0.35
                };
                draw_disk(system_ctx, star.px, star.py, 25);
                system_ctx.strokeStyle = '#ffffff';
                var size = 450;
                centered(system_ctx, current_system.System, star.px, 10);
                var ls = current_system.Locations;
                for (i = 0; i < ls.length; i++) {
                    var r = i * 25 + 50;
                    draw_circle(system_ctx, star.px, star.py, r);
                    draw_disk(system_ctx, star.px + r, star.py, 10);
                    var l = ls[i];
                    centeredTop(system_ctx, l.Name + ", TL: " + l.TL, star.px, star.py + r);
                }
                setTimeout(function () {
                    document.addEventListener('touchstart', canvas_touch_start_listener, false);
                    document.addEventListener('touchend', view_location_listener, false);
                }, 0);
                current_location = null;
            },
            onleavesystem: function (e, from, to) {
                document.removeEventListener('touchstart', canvas_touch_start_listener, false);
                document.removeEventListener('touchend', view_location_listener, false);
            },
            onbeforeview_location: function (e, from, to, x, y) {
                var star = {
                    px: system_canvas.width / 2,
                    py: system_canvas.height * 0.35
                };
                var ls = current_system.Locations;
                for (i = 0; i < ls.length; i++) {
                    var r = i * 25 + 50;
                    if (dist(x, y, star.px + r, star.py) <= 10) {
                        current_location = ls[i];
                        return true;
                    }
                }
                return false;
            },
            onenterlocation: function (e, from, to, x, y) {
                location_ctx.clearRect(0, 0, location_canvas.width, location_canvas.height);
                location_ctx.fillStyle = '#000000';
                location_ctx.fillRect(0, 0, location_canvas.width, location_canvas.height);
                location_ctx.fillStyle = '#ffffff';
                centered(location_ctx, current_location.Name,
                         location_canvas.width / 2, location_canvas.height / 2);
                setTimeout(function () {
                    location_canvas.addEventListener('touchstart', canvas_touch_start_listener, false);
                    location_canvas.addEventListener('touchend', location_back_listener, false);
                }, 0);
            },
            onleavelocation: function (e, from, to) {
                location_canvas.removeEventListener('touchstart', canvas_touch_start_listener, false);
                location_canvas.removeEventListener('touchend', location_back_listener, false);
            }
        }
    });

})();
