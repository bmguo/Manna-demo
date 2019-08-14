// all of the global variables for dynamics
var gpx_black = null;
var gpx_white = null;
var gpx_size = 0;
var canvasN = 512;
var gbuffer;
var gbufferdata;

var gboard = null;
var glattice = null;
var gnnlist = null;

var gN = 256;
var gdensity = 2.0;
var ghmax = 1
var gt = 0;

// display variables
var c;
var ctx;
var ctxgraph;
var empty;
var dodraw = true;
var gh = 150;
var gw = 370;

function rgb(r,g,b) {
    return 'rgb('+r+','+g+','+b+')';
}

function toFixed(value, precision, negspace) {
    negspace = typeof negspace !== 'undefined' ? negspace : '';
    var precision = precision || 0;
    var sneg = (value < 0) ? "-" : negspace;
    var neg = value < 0;
    var power = Math.pow(10, precision);
    var value = Math.round(value * power);
    var integral = String(Math.abs((neg ? Math.ceil : Math.floor)(value/power)));
    var fraction = String((neg ? -value : value) % power);
    var padding = new Array(Math.max(precision - fraction.length, 0) + 1).join('0');
    return sneg + (precision ? integral + '.' +  padding + fraction : integral);
}

function gen_nnlist() {
    gnnlist = [];
    for (var x = 0; x < gN; x++) {
        for (var y = 0; y < gN; y++) {
            var idx = x + y * gN;
            gnnlist[idx * 4 + 0] = (x - 1).mod(gN) + y * gN;
            gnnlist[idx * 4 + 1] = (x + 1).mod(gN) + y * gN;
            gnnlist[idx * 4 + 2] = x + ((y - 1).mod(gN)) * gN;
            gnnlist[idx * 4 + 3] = x + ((y + 1).mod(gN)) * gN;
        }
    }
}

function convert_board() {
    gboard = [];
    for (var i = 0; i < gN * gN; i++) {
        if (glattice[i] > ghmax) {
            gboard[i] = 1;
        } else {
            gboard[i] = -1;
        }
    }
}

function init_board(N, density, hmax) {
    gt = 0;
    gN = N;
    gdensity = density;
    ghmax = hmax;

    glattice = [];
    for (var i = 0; i < gN * gN; i++)
        glattice[i] = 0;
    for (var i = 0; i < Math.round(gN * gN * gdensity); i++) {
        var randidx = Math.floor(Math.random() * gN * gN);
        glattice[randidx] += 1;
    }
    for (var i = 0; i < gN * gN; i++)
        glattice[i] *= ghmax;

    convert_board();
    gen_nnlist()

    gpx_size = canvasN / gN;
    draw_all();
}

function put_pixel(x, y, size, color){
    var xoff = x*size;
    var yoff = y*size;
    for (var i=0; i<size; i++){
        for (var j=0; j<size; j++){
            var ind = ((yoff+j)*gN*size + xoff+ i)*4;
            var c = (color+1)/2 * 255;
            gbufferdata[ind+0] = c;
            gbufferdata[ind+1] = c;
            gbufferdata[ind+2] = c;
            gbufferdata[ind+3] = 255;
        }
    }
}

function display_board(N, board){
    for (var i=0; i<N; i++){
        for (var j=0; j<N; j++){
            put_pixel(i, j, gpx_size, -board[i+j*N] * (2*(i%2)-1)*(2*(j%2)-1) * (2*(gt%2)-1));
            // put_pixel(i, j, gpx_size, -board[i + j * N]);
        }
    }
}

function update_manna() {
    var lattice_update = new Array(gN*gN).fill(0);

    for (var x = 0; x < gN; x++) {
        for (var y = 0; y < gN; y++) {
            var idx = x + y * gN;
            if (glattice[idx] > ghmax) {
                for (var j = 0; j < glattice[idx]; j++) {
                    var nnrand = Math.floor(Math.random() * 4);
                    lattice_update[gnnlist[idx * 4 + nnrand]] += 1;
                }
                lattice_update[idx] -= glattice[idx];
            }
        }
    }

    for (var i = 0; i < gN * gN; i++) {
        glattice[i] += lattice_update[i];
    }

    convert_board();
    gt += 1;
}

function update() {
    update_manna();
}

function update_measurements_labels(){
    lblt = document.getElementById('label_time');
    lblt.innerHTML = "time = "+toFixed(gt, 0, ' ');
}

function draw_all(){
    display_board(gN, gboard);
    gbuffer.data = gbufferdata;
    ctx.putImageData(gbuffer, 0, 0);
    update_measurements_labels();
}

/*======================================================================
  the javascript interface stuff
=========================================================================*/
function dotextbox(id){
    idt = id+"_input";
    document.getElementById(id).style.display = 'none';
    document.getElementById(idt).style.display = 'inline';
    document.getElementById(idt).value = document.getElementById(id).innerHTML;
    document.getElementById(idt).focus();
}

function undotextbox(id){
    idt = id.replace("_input", "");
    document.getElementById(idt).style.display = 'inline';
    document.getElementById(id).style.display = 'none';
}

function update_density(){
    gdensity = parseFloat(document.getElementById('density').value);
    document.getElementById('label_density').innerHTML = toFixed(gdensity, 3);
    init_board(gN, gdensity, ghmax)
}

function update_hmax(){
    ghmax = parseFloat(document.getElementById('hmax').value);
    document.getElementById('label_hmax').innerHTML = toFixed(ghmax, 0);
    init_board(gN, gdensity, ghmax)
}

function update_display(){
    document.getElementById('label_density').innerHTML = toFixed(gdensity, 3);
    document.getElementById('label_hmax').innerHTML = toFixed(ghmax, 0);
}

function update_pause(){
    if (dodraw == true){
        document.getElementById('pause').value = 'Start';
        dodraw = false;
    } else {
        document.getElementById('pause').value = 'Pause';
        requestAnimationFrame(tick, c);
        dodraw = true;
    }
}

function update_restart(){
    init_board(gN, gdensity, ghmax)
}

function update_step(){
    if (dodraw)
        update_pause();

    update();
    draw_all();
}

/*===============================================================================
    initialization and drawing
================================================================================*/
function clear(){
    ctx.fillStyle = 'rgba(200,200,200,0.2)';
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillRect(0,0,c.width,c.height);
}

var tick = function(T) {
    if (dodraw == true) {
        update();
        draw_all();
        requestAnimationFrame(tick, c);
    }
};

function change_num(){
    gN = parseInt(document.getElementById('changenum').value);
    init_board(gN, gdensity, ghmax);
}



var init = function() {
    // create the canvas element
    empty = document.createElement('canvas');
    empty.width = empty.height = 1;
    c = document.getElementById('canvas');
    c.style.cursor = 'url('+empty.toDataURL()+')';
    ctx = c.getContext('2d');
    gbuffer = ctx.getImageData(0, 0, canvasN, canvasN);
    gbufferdata = gbuffer.data;

    Number.prototype.mod = function(n) {
        return ((this%n)+n)%n;
    }

    document.getElementById('label_density_input').addEventListener("keydown", function(e) {
        if (e.keyCode == 13){
            e.preventDefault();
            document.getElementById('density').value = document.getElementById('label_density_input').value;
            update_density();
            undotextbox('label_density_input');
        }
    }, false);

    document.getElementById('label_hmax_input').addEventListener("keydown", function(e) {
        if (e.keyCode == 13){
            e.preventDefault();
            document.getElementById('hmax').value = document.getElementById('label_hmax_input').value;
            update_hmax();
            undotextbox('label_hmax_input');
        }
    }, false);

    clear();
    init_board(gN, gdensity, ghmax);
    update_display();

    document.body.addEventListener('keyup', function(ev) {
        if (ev.keyCode == 32){ ev.preventDefault(); update_pause(); } //space is pause
    }, false);

    document.body.addEventListener('keydown', function(ev) {
    }, false);

    registerAnimationRequest();
    requestAnimationFrame(tick, c);
};
window.onload = init;


// Provides requestAnimationFrame in a cross browser way.
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
function registerAnimationRequest() {
if ( !window.requestAnimationFrame ) {
    window.requestAnimationFrame = ( function() {
      return window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame || // comment out if FF4 is slow (it caps framerate at ~30fps)
      window.oRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      function( /* function FrameRequestCallback */ callback, /* DOMElement Element */ element ) {
              window.setTimeout( callback, 1 ); /*1000 / 60 );*/
      };
    } )();
}
}


