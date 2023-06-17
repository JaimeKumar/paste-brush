import './App.css';
import $ from 'jquery';
import { ChromePicker } from 'react-color';
import { useState, useEffect } from 'react';

function App() {

  const [isGrad, setIsGrad] = useState(false);
  const selectOptions = {
    selectBlockBG: () => {
      $(`#gradColourPicker`).addClass('hide');
      $(`#blockColourPicker`).removeClass('hide');
      setIsGrad(false);
    },
    selectGradientBG: () => {
      $(`#blockColourPicker`).addClass('hide');
      $(`#gradColourPicker`).removeClass('hide');
      setIsGrad(true);
    }
  }
  const [bgBlockColor, setBlockBG] = useState({hex: '#fff'});
  const [bgGrad, setGradBG] = useState(['#fff', '#000']);
  const [gradPos, setGradPos] = useState(0);
  const [gradAngle, setGradAngle] = useState({x0: 0, y0: 0, x1: 3000, y1: 3000})
  const [dragStart, setDragStart] = useState(0);
  const [dragTarg, setDragTarg] = useState(null);
  const [dragInitial, setDragInit] = useState(0);
  const [sliderPositions, setSliders] = useState({
    size: 50,
    rotate: 0,
    density: 350,
    speed: [0, 0],
    amp: [0, 0]
  })
  const [slideGrabbed, setSlideGrabbed] = useState(null);
  const [paintStart, setPaintStart] = useState(null);
  const [slideStart, setSlideStart] = useState(0);
  const [img, setImg] = useState([]);
  const [imgPos, setImgPos] = useState(-1);
  const [painted, setPainted] = useState([]);
  const [allPaints, setAllPaints] = useState([]);
  const [canvState, setCanvState] = useState(null);
  const [canvas, setCanvas] = useState(null);
  const [canvUrl, setCanvUrl] = useState(null);
  const [erasing, setErasing] = useState(false);
  const [eraseStroke, setEraseStroke] = useState(false);
  const [modPos, setModPos] = useState(0);
  const [wave, setWave] = useState([0, 0]);
  const [wavePos, setWavePos] = useState([0, 0]);
  const [undoArray, setUndo] = useState([]);


  useEffect(() => {
    setCanvas({
      canv: $('#canv')[0],
      c: $('#canv')[0].getContext('2d')
    })

    $('#imageUpload').on('change', () => {
      let imgArr = [];
      Array.from($('#imageUpload').prop('files')).forEach(img => {
        var paintImg = new Image();
        paintImg.onload = () => {
          imgArr.push(paintImg)
          setImg([...imgArr])
          setImgPos(0);
        }
        paintImg.src = URL.createObjectURL(img) 
      })
    })
  }, [])

  useEffect(() => {
    update();
  }, [bgGrad, gradAngle, bgBlockColor, painted, canvState])

  useEffect(() => {
    finishStroke();
  }, [isGrad])
  
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

  function startDrag(e) {
    setDragStart(e.clientY);
    setDragTarg(e.target.id);
    setDragInit(gradAngle[e.target.id])
  }

  function moveDrag(e) {

    if (eraseStroke) {
      collides(e);
      return;
    }

    if (paintStart) {
      let delta = Math.sqrt(Math.pow((e.clientX - paintStart.x), 2) + Math.pow((e.clientY - paintStart.y), 2))
      let density = ($('.slider').width() - sliderPositions.density)/4;
      if (delta > density) {
        addPaste(e)
        setPaintStart({x: e.clientX, y: e.clientY});
      }
      return;
    }

    if (slideGrabbed) {
      let slideLength = $('.slider').width();
      let tempSlidePos = {...sliderPositions};
      let newVal;
      if (tempSlidePos[slideGrabbed].length > 1) {
        newVal = tempSlidePos[slideGrabbed][modPos] + Math.round(e.clientX - slideStart);
      } else {
        newVal = tempSlidePos[slideGrabbed] + Math.round(e.clientX - slideStart);
      }
      if (newVal < 0) {
        newVal = 0;
      } else if (newVal > slideLength) {
        newVal = slideLength;
      }
      if (tempSlidePos[slideGrabbed].length > 1) {
        tempSlidePos[slideGrabbed][modPos] = newVal;
      } else {
        tempSlidePos[slideGrabbed] = newVal;
      }


      setSliders(tempSlidePos);
      setSlideStart(e.clientX);
      return;
    }

    if (!dragTarg) return;

    if (dragTarg === 'gradPos') {
      let tempPos = gradPos;
      tempPos = gradPos + Math.round((dragStart - e.clientY)/50);
      if (tempPos < bgGrad.length && tempPos > -1 && tempPos !== gradPos) {
        setGradPos(tempPos);
        setDragStart(e.clientY);
      }
    } else {
      let currentAngle = {...gradAngle};
      currentAngle[dragTarg] = dragInitial + Math.round((dragStart - e.clientY) * 2);
      if (currentAngle[dragTarg] > 6000) currentAngle[dragTarg] = 6000;
      if (currentAngle[dragTarg] < -6000) currentAngle[dragTarg] = -6000;
      setGradAngle(currentAngle);
    }
  }
  
  function endDrag() {
    setDragTarg(null);
    setSlideGrabbed(null);
    setPaintStart(null);
    finishStroke();
    setEraseStroke(false)
  }

  function addGradStop() {
    let tempGrad = [...bgGrad];
    tempGrad.push('#000');
    setGradBG(tempGrad);
  }

  function startSlide(e) {
    setSlideGrabbed(e.target.id);
    setSlideStart(e.clientX);
  }

  function startStroke(e) {
    if (img.length < 1 || e.buttons !== 1) return;
    if (erasing) {
      setEraseStroke(true)
      collides(e);
    } else {
      addPaste(e)
    }
  }

  function collides(e) {
    var canvW = $('#canv').width();
    let pos = {x: (e.clientX - $('#canv').offset().left) * (3000/canvW), y: (e.clientY - $('#canv').offset().top) * (3000/canvW)};

    for (var i = allPaints.length - 1; i > -1; i--) {
      let p = allPaints[i];
      let xCollide = pos.x > p.x - (p.w/2) && pos.x < p.x + (p.w/2);
      let yCollide = pos.y > p.y - (p.h/2) && pos.y < p.y + (p.h/2);
      if (xCollide && yCollide) {
        allPaints.splice(i, 1)
        break;
      }
    }
  }

  function drawBackground() {
    if (!canvas) return;
    if (isGrad) {
      var grd = canvas.c.createLinearGradient(gradAngle.x0, gradAngle.y0, gradAngle.x1, gradAngle.y1);
      for (var i = 0; i < bgGrad.length; i++) {
        grd.addColorStop((i/(bgGrad.length-1)), bgGrad[i]);
      }
      canvas.c.fillStyle = grd;
      canvas.c.fillRect(0, 0, canvas.canv.width, canvas.canv.height);
    } else {
      canvas.c.fillStyle = bgBlockColor.hex;
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

    let w = (sliderPositions.size/15) * img[imgPos].width + (wave[0] * 100);
    let h = (sliderPositions.size/15) * img[imgPos].height + (wave[0] * 100);
    if (w < 1) w = 1;
    if (h < 1) w = 1;

    let paste = {
      img: img[imgPos],
      x: (e.clientX - $('#canv').offset().left) * (3000/canvW),
      y: (e.clientY - $('#canv').offset().top) * (3000/canvW),
      w: w,
      h: h,
      r: (((sliderPositions.rotate/$('.slider').width()) + (wave[1]/4)) * 2) * Math.PI
    }
    tempPainted.push(paste)
    tempPaints.push(paste)
    setPainted([...tempPainted]);
    setAllPaints([...tempPaints]);
    
    setPaintStart({
      x: (e.clientX - $('#canv').offset().left) * (3000/canvW),
      y: (e.clientY - $('#canv').offset().top) * (3000/canvW)
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

  function changeNumber(e) {
    e.target.contentEditable = true;
    e.target.focus();
  }

  function finishChange(e) {
    let tempGrad = {...gradAngle}
    tempGrad[e.target.id] = e.target.innerHTML;
    if (tempGrad[e.target.id] > 6000) tempGrad[e.target.id] = 6000;
    if (tempGrad[e.target.id] < -6000) tempGrad[e.target.id] = -6000;
    e.target.innerHTML = tempGrad[e.target.id];
    setGradAngle(tempGrad)
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
    let slideW = $('.slider').width();

    for (var i = 0; i < 2; i++) {
      temp[i] += (sliderPositions.amp[i]/slideW) * Math.sin(time[i])
      time[i] += (sliderPositions.speed[i])/slideW;
    }

    setWavePos(time);
    setWave(temp)
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
    <div className="App" onMouseMove={moveDrag} onMouseUp={endDrag}>
      <div className='sideCont'>
        <div className="dialogBox">
          <h3>Background</h3>
          <div className="selectBox">
            <div id="selectBlockBG" className="selectOption selected leftEdge" onClick={clickOption}>
              Block
            </div>
            <div id="selectGradientBG" className="selectOption rightEdge" onClick={clickOption}>
              Gradient
            </div>
          </div>
          <div id="blockColourPicker">
            <ChromePicker disableAlpha={true} color={bgBlockColor} width={'100%'} onChange={updatedColor => {setBlockBG(updatedColor)}}/>
          </div>

          <div id="gradColourPicker" className='hide'>
            <div className="colContainer">
              <div className="buttonCol">
                <span>x0</span>
                <div id='x0' className="number" onMouseDown={startDrag} onDoubleClick={changeNumber} onBlur={finishChange}>{Math.round(gradAngle.x0)}</div>
                <span>y0</span>
                <div id='y0' className="number" onMouseDown={startDrag} onDoubleClick={changeNumber} onBlur={finishChange}>{Math.round(gradAngle.y0)}</div>
                <span>x1</span>
                <div id='x1' className="number" onMouseDown={startDrag} onDoubleClick={changeNumber} onBlur={finishChange}>{Math.round(gradAngle.x1)}</div>
                <span>y1</span>
                <div id='y1' className="number" onMouseDown={startDrag} onDoubleClick={changeNumber} onBlur={finishChange}>{Math.round(gradAngle.y1)}</div>
                <span>Stop</span>
                <div id='gradPos' className="number" onMouseDown={startDrag}>{gradPos}</div>
                <div className="button" onClick={addGradStop}>+</div>
              </div>
              <ChromePicker disableAlpha={true} color={bgGrad[gradPos]} width={'80%'} onChange={updatedColor => {updateCurrentBgNode(updatedColor.hex)}} />
            </div>
          </div>
          
          <div id="modulationBox">
            <h3>Modulation</h3>
            <div className="selectBox">
              <div id='modsize' className="selectOption leftEdge selected" onClick={modOpt}>Size</div>
              <div id='modrotate' className="selectOption rightEdge" onClick={modOpt}>Rotation</div>
            </div>
            <p>Speed</p>
            <div className="slider">
              <div className="slideProgress" style={{width: sliderPositions.speed[modPos]}} ></div>
              <div className="sliderHandle" id='speed' style={{left: sliderPositions.speed[modPos]}} onMouseDown={startSlide}></div>
            </div>
            <p>Amplitude</p>
            <div className="slider">
              <div className="slideProgress" style={{width: sliderPositions.amp[modPos]}} ></div>
              <div className="sliderHandle" id='amp' style={{left: sliderPositions.amp[modPos]}} onMouseDown={startSlide}></div>
            </div>
          </div>

          <div className='buttonRow'>
            <div className="button norm" id='clearButton' onClick={undo}>Undo</div>
            <div className="button norm" id='clearButton' onClick={redo}>Redo</div>
            <div className="button norm" id='clearButton' onClick={clearCanv}>Clear</div>
            <div className="button norm" id='eraseButton' onClick={enableEraser}>Eraser</div>
          </div>
        </div>
      </div>

      <canvas id='canv' onMouseDown={startStroke} width={3000} height={3000}></canvas>

      <div className="sideCont" style={{right: 0}}>
        <div className="dialogBox">
          <h3>Image</h3>
          <div className="row" style={{height: 'fit-content', width: '100%'}}>
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
              return <img id='imgPreview' src={img.src} alt="" style={{transform: `rotate(${sliderPositions.rotate}grad) scale(${((sliderPositions.size*2)/$('.slider').width())})`}}/>
            })}
          </div>
          <br />
          <p>Size</p>
          <div className="slider">
            <div className="slideProgress" style={{width: sliderPositions.size}}></div>
            <div className="sliderHandle" id='size' style={{left: sliderPositions.size}} onMouseDown={startSlide}></div>          
          </div>
          <p>Rotation</p>
          <div className="slider">
            <div className="slideProgress" style={{width: sliderPositions.rotate}}></div>
            <div className="sliderHandle" id='rotate' style={{left: sliderPositions.rotate}} onMouseDown={startSlide}></div>
          </div>
          <p>Density</p>
          <div className="slider">
            <div className="slideProgress" style={{width: sliderPositions.density}}></div>
            <div className="sliderHandle" id='density' style={{left: sliderPositions.density}} onMouseDown={startSlide}></div>
          </div>
        </div>  
      </div>      
    </div>
  );
}

export default App;
