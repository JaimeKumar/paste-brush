import './App.css';
import $ from 'jquery';
import { SketchPicker } from 'react-color';
import { useState, useEffect, useRef } from 'react';

function App() {

  const selectOptions = {
    bgTab: () => {
      $('#bgBox').removeClass('hide')
      $('#imgBox').addClass('hide')
      $('#modBox').addClass('hide')
    },
    imgTab: () => {
      $('#bgBox').addClass('hide')
      $('#imgBox').removeClass('hide')
      $('#modBox').addClass('hide')
      
    },
    modTab: () => {
      $('#bgBox').addClass('hide')
      $('#imgBox').addClass('hide')
      $('#modBox').removeClass('hide')
    }
  }
  const [bgGrad, setGradBG] = useState(['#fff']);
  const [gradPos, setGradPos] = useState(0);
  const [gradAngle, setGradAngle] = useState({x0: 0, y0: 0, x1: 3000, y1: 3000})
  const [sliderPositions, setSliders] = useState({
    size: [50, 50],
    rotate: [0, 0],
    density: [0, 0],
    speed: [0, 0],
    amp: [0, 0]
  })
  const [paintStart, setPaintStart] = useState(null);
  const [img, setImg] = useState([]);
  const [imgPos, setImgPos] = useState(-1);
  const [painted, setPainted] = useState([]);
  const [allPaints, setAllPaints] = useState([]);
  const [canvState, setCanvState] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [waveGraph, setWaveGraph] = useState(null);
  const [canvUrl, setCanvUrl] = useState(null);
  const [erasing, setErasing] = useState(false);
  const [eraseStroke, setEraseStroke] = useState(false);
  const [modPos, setModPos] = useState(0);
  const [wave, setWave] = useState([0, 0]);
  const [wavePos, setWavePos] = useState([0, 0]);
  const [undoArray, setUndo] = useState([]);


  useEffect(() => {
    setWaveGraph({
      canv: $('#waveCanv')[0],
      c: $('#waveCanv')[0].getContext('2d')
    })

    setCanvas({
      canv: $('#canv')[0],
      c: $('#canv')[0].getContext('2d')
    })

    $('#imageUpload').on('change', () => {
      uploadImgs(Array.from($('#imageUpload').prop('files')));
    })

    $('#mobImageUpload').on('change', () => {
      uploadImgs(Array.from($('#mobImageUpload').prop('files')));
    })
  }, [])

  useEffect(() => {
    update();
  }, [bgGrad, gradAngle, painted, canvState])

  useEffect(() => {
    drawWave();
  }, [sliderPositions, modPos])

  function uploadImgs(files) {
    let imgArr = [];
    let x = 0;

    let doFile = file => {
      var paintImg = new Image();
      paintImg.onload = () => {
        imgArr.push(paintImg)
        x++;
        imgLoop(files);
      }
      paintImg.src = URL.createObjectURL(file)
    }

    let imgLoop = files => {
      if (x >= files.length) {
        setImg([...imgArr])
        setImgPos(0);
        return;
      }
      doFile(files[x]);
    }
    imgLoop(files);
  }

  function changeGradpoint(e) {
    let temp = {...gradAngle};
    temp[e.target.id] = e.target.value;
    setGradAngle(temp);
  }

  function clickOption(e) {
    Array.from(e.target.parentElement.children).forEach(child => {
      $(`#${child.id}`).removeClass('selected');
    })
    $(`#${e.target.id}`).addClass('selected');
    selectOptions[e.target.id]();
  }

  function updateCurrentBgNode(color) {
    let currentGrad = [...bgGrad];
    currentGrad[gradPos] = color;
    setGradBG(currentGrad);
  }

  function sliderChanged(e) {
    let temp = {...sliderPositions};
    temp[e.target.name][modPos] = e.target.value;
    setSliders(temp)
  }

  function moveDrag(e) {
    if (!eraseStroke && !paintStart) return;
    let x = e.clientX || e.touches[0].clientX;
    let y = e.clientY || e.touches[0].clientY;

    if (eraseStroke) {
      collides(e);
      return;
    }

    if (paintStart) {
      let delta = Math.sqrt(Math.pow((x - paintStart.x), 2) + Math.pow((y - paintStart.y), 2))
      let density = (100 -sliderPositions.density[modPos])/4;
      if (delta > density) {
        addPaste(e)
        setPaintStart({x: x, y: y});
      }
      return;
    }
  }
  
  function endDrag() {
    setPaintStart(null);
    finishStroke();
    setEraseStroke(false)
  }

  function addGradStop() {
    let tempGrad = [...bgGrad];
    tempGrad.push('#000');
    setGradBG(tempGrad);
    setGradPos(tempGrad.length - 1)
  }

  function startStroke(e) {
    if (img.length < 1 || (e.buttons !== 1 && e.type !== 'touchstart')) return;
    if (erasing) {
      setEraseStroke(true)
      collides(e);
    } else {
      addPaste(e)
    }
  }

  function collides(e) {
    var canvW = $('#canv').width();
    let pos = {
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    }
    let loc = {x: (pos.x - $('#canv').offset().left) * (3000/canvW), y: (pos.y - $('#canv').offset().top) * (3000/canvW)};

    for (var i = allPaints.length - 1; i > -1; i--) {
      let p = allPaints[i];
      let xCollide = loc.x > p.x - (p.w/2) && loc.x < p.x + (p.w/2);
      let yCollide = loc.y > p.y - (p.h/2) && loc.y < p.y + (p.h/2);
      if (xCollide && yCollide) {
        allPaints.splice(i, 1)
        break;
      }
    }
  }

  function drawBackground() {
    if (!canvas) return;
    if (bgGrad.length > 1) {
      var grd = canvas.c.createLinearGradient(gradAngle.x0, gradAngle.y0, gradAngle.x1, gradAngle.y1);
      for (var i = 0; i < bgGrad.length; i++) {
        grd.addColorStop((i/(bgGrad.length-1)), bgGrad[i]);
      }
      canvas.c.fillStyle = grd;
      canvas.c.fillRect(0, 0, canvas.canv.width, canvas.canv.height);
    } else {
      canvas.c.fillStyle = bgGrad[0];
      canvas.c.fillRect(0, 0, canvas.canv.width, canvas.canv.height);
    }
  }

  function drawForeground() {
    if (!canvas) return;
    painted.forEach(item => {
      canvas.c.fillStyle = 'red';
      canvas.c.beginPath();
      canvas.c.arc(item.x, item.y, item.w/2, 0, 2 * Math.PI);
      canvas.c.fill();
    })
  }

  function addPaste(e) {
    var canvW = $('#canv').width();

    let tempPainted = [...painted];
    let tempPaints = [...allPaints];
    let pos = {
      x: e.clientX || e.touches[0].clientX,
      y: e.clientY || e.touches[0].clientY
    }

    let aspect = img[imgPos].width/img[imgPos].height;
    let w = ((sliderPositions.size[modPos]) * 25 *aspect) + (wave[0] * 100);
    let h = (sliderPositions.size[modPos] * 25) + (+wave[0] * 100);
    
    if (w < 1) w = 1;
    if (h < 1) w = 1;
    
    let paste = {
      img: img[imgPos],
      x: (pos.x - $('#canv').offset().left) * (3000/canvW),
      y: (pos.y - $('#canv').offset().top) * (3000/canvW),
      w: w,
      h: h,
      r: (((sliderPositions.rotate[modPos]/100) + (wave[1]/4)) * 2) * Math.PI
    }
    tempPainted.push(paste)
    tempPaints.push(paste)
    setPainted([...tempPainted]);
    setAllPaints([...tempPaints]);
    
    setPaintStart({
      x: (pos.x- $('#canv').offset().left) * (3000/canvW),
      y: (pos.y - $('#canv').offset().top) * (3000/canvW)
    });
    tickWave();
  }

  useEffect(() => {
    let tempimg = new Image();
    tempimg.onload = () => {
      setCanvState(tempimg);

      setPainted([]);
    }
    tempimg.src = canvUrl;
  }, [canvUrl])

  function update() {
    if (!canvas) return;

    if (canvState) {
      canvas.c.drawImage(canvState, 0, 0)
    } else {
      drawBackground();
    }
    drawForeground();
    drawWave();
  }

  function finishStroke() {
    if (!canvas) return;
    drawBackground();
    allPaints.forEach(item => {
      canvas.c.translate(item.x, item.y);
      canvas.c.rotate(item.r);
      canvas.c.drawImage(item.img, -(item.w/2), -(item.h/2), item.w, item.h)
      canvas.c.rotate(-item.r);
      canvas.c.translate(-item.x, -item.y);
    })
    setCanvUrl($('#canv')[0].toDataURL())

    setWave([0, 0]);
    setWavePos([0, 0])
  }

  function clearCanv() {
    drawBackground();
    setAllPaints([]);
  }

  function enableEraser(e) {
    $('#canv').toggleClass('cutMode');
    $(`#${e.target.id}`).toggleClass('selected');
    setErasing(p => !p);
  }

  function imgChange(n) {
    let p = imgPos + n;
    if (p > img.length -1) {
      p = img.length -1;
    } else if (p < 0) p = 0;

    setImgPos(p);
  }

  function modOpt(e) {
    if (!canvas) return;
    setModPos(p => ((p * -1) + 1))
    $('#modsize').toggleClass('selected')
    $('#modrotate').toggleClass('selected')
  }

  function tickWave() {
    let temp = [...wave];
    let time = [...wavePos];

    for (var i = 0; i < 2; i++) {
      temp[i] += (sliderPositions.amp[i]/100) * Math.sin(time[i])
      time[i] += sliderPositions.speed[i]/500;
    }
    setWavePos(time);
    setWave(temp)
  }

  function drawWave() {
    if (!waveGraph) return;
    let w = waveGraph.canv.width;
    let h = waveGraph.canv.height;
    waveGraph.c.fillStyle = '#fff';
    waveGraph.c.fillRect(0, 0, w, h)
    waveGraph.c.strokeStyle = '#777';
    waveGraph.c.beginPath();
    waveGraph.c.moveTo(0, h/2);
    waveGraph.c.lineTo(w, h/2);
    waveGraph.c.stroke();

    waveGraph.c.strokeStyle = '#113377';
    waveGraph.c.beginPath();
    for (var x = 0; x < 360; x++) {
      let i = x;
      waveGraph.c.moveTo((i/(3.6 * sliderPositions.speed[modPos])) * (w), (h/2) + (Math.sin(i) * 0.6 * sliderPositions.amp[modPos]));
      waveGraph.c.lineTo(((i+1)/(3.6 * sliderPositions.speed[modPos])) * (w), (h/2) + (Math.sin(i+1) * 0.6 * sliderPositions.amp[modPos]));
    }
    waveGraph.c.stroke();
  }

  function undo() {
    if (allPaints.length < 1) return;
    let tempPaints = [...allPaints];
    let tempUndo = [...undoArray];
    tempUndo.push(tempPaints.splice(-1)[0])
    setUndo([...tempUndo]);
    setAllPaints([...tempPaints]);
  }

  function redo() {
    if (undoArray.length < 1) return;
    let tempPaints = [...allPaints];
    let tempUndo = [...undoArray];
    tempPaints.push(tempUndo.splice(-1)[0]); 
    setAllPaints([...tempPaints]);
    setUndo([...tempUndo]);
  }

  return (
    <div className="App" onMouseUp={endDrag} onTouchEnd={endDrag}>
      
      <canvas id='canv' onTouchStart={startStroke} onMouseDown={startStroke} onMouseMove={moveDrag} onTouchMove={moveDrag} width={3000} height={3000}></canvas>

      <div id="dialogs">
        <div className="tab">
          <div id='bgTab' className="tabOption leftest selected" onClick={clickOption}>Background</div>
          <div id='imgTab' className="tabOption" onClick={clickOption}>Images</div>
          <div id='modTab' className="tabOption" onClick={clickOption}>Modulation</div>
        </div>

        <div id="bgBox" className='dialogPage'>
          <SketchPicker presetColors={[]} disableAlpha={true} color={bgGrad[gradPos]} width={'95%'} onChange={updatedColor => {updateCurrentBgNode(updatedColor.hex)}} />
          <div className='rowBox'>
            <div className="colBox">
              <b>Gradient Stop</b>
              <div className='row'>
                <div className="button arrow" onClick={() => {setGradPos(p => {return p-1})}}> &lt;</div>
                <span>{gradPos + 1}&nbsp;/&nbsp;{bgGrad.length}</span>
                <div className="button arrow" onClick={() => {setGradPos(p => {return p+1})}}> &gt;</div>
              </div>
              <div className="button" onClick={addGradStop}><big>+ </big> Add Stop</div>
            </div>

            <div className="colBox">
              <b>Gradient Position</b>
              <div className="row">
                <div className="colBox">
                  <div className="row">
                    <span>x0</span>
                    <input type="number" id='x0' value={0 || gradAngle.x0} onChange={changeGradpoint}/>
                  </div>
                  <div className="row">
                    <span>y0</span>
                    <input type="number" id='y0' value={0 || gradAngle.y0} onChange={changeGradpoint}/>
                  </div>
                </div>
                <div className="colBox">
                  <div className="row">
                    <span>x1</span>
                    <input type="number" id='x1' value={0 || gradAngle.x1} onChange={changeGradpoint}/>
                  </div>
                  <div className="row">
                    <span>y1</span>
                    <input type="number" id='y1' value={0 || gradAngle.y1} onChange={changeGradpoint}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dialogPage hide" id="imgBox">
          <div className="row">
            <input id='imageUpload' type="file" accept="image/jpeg, image/png, image/jpg" multiple={true}></input>
            <div id="imagePicker">
              <div className='row'>
                <div className="button arrow" onClick={() => imgChange(-1)}> &lt;</div>
                <span>{imgPos + 1}&nbsp;/&nbsp;{img.length}</span>
                <div className="button arrow" onClick={() => imgChange(1)}> &gt;</div>
              </div>
            </div>
          </div>
          <div id="imgPreview">
            {img.map((img, i) => {
              if (i !== imgPos) return;
              return <img id='imgPreview' src={img.src} alt="" style={{transform: `rotate(${sliderPositions.rotate[modPos]*4}grad) scale(${((sliderPositions.size[modPos]*2)/100)})`}}/>
            })}
          </div>
          <div className='sliders'>
            <p>Size</p>
            <input type="range" name="size" value={sliderPositions.size[modPos] || 0} onChange={sliderChanged}/>
            <p>Rotation</p>
            <input type="range" name="rotate" value={sliderPositions.rotate[modPos] || 0} onChange={sliderChanged}/>
            <p>Density</p>
            <input type="range" name="density" value={sliderPositions.density[modPos] || 0} onChange={sliderChanged}/>
          </div>
        </div>

        <div className="dialogPage hide" id="modBox">
          <div className="selectBox" onClick={modOpt}>
            <div id='modsize' className="selectOption leftEdge selected">Size</div>
            <div id='modrotate' className="selectOption rightEdge">Rotation</div>
          </div>
          <p>Speed</p>
          <input type="range" name="speed" value={sliderPositions.speed[modPos] || 0} onChange={sliderChanged}/>
          <p>Amplitude</p>
          <input type="range" name="amp" value={sliderPositions.amp[modPos] || 0} onChange={sliderChanged} />

          <canvas id="waveCanv"></canvas>
        </div>

        <div className='row' id='mainButtons'>
          <div className="button" id='eraseButton' onClick={enableEraser}>Eraser</div>
          <div className="button" onClick={clearCanv}>Clear</div>
          <div className="button" onClick={undo}>Undo</div>
          <div className="button" onClick={redo}>Redo</div>
        </div>
      </div>
    </div>
  );
}

export default App;
