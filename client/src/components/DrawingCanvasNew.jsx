import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

const DrawingCanvas = forwardRef(({ socket, roomId, color, strokeWidth, tool, selectedShape, penType, onDrawEnd }, ref) => {
  const canvasRef = useRef();
  const ctxRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const previewCanvasRef = useRef();
  const previewCtxRef = useRef();

  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  const toolRef = useRef(tool);
  const shapeRef = useRef(selectedShape);
  const penTypeRef = useRef(penType);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    loadFromDataURL: (dataURL) => {
      const img = new Image();
      img.onload = () => {
        const ctx = ctxRef.current;
        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = dataURL;
    }
  }));

  // Update refs on prop change
  useEffect(() => {
    colorRef.current = color;
    widthRef.current = strokeWidth;
    toolRef.current = tool;
    shapeRef.current = selectedShape;
    penTypeRef.current = penType;
  }, [color, strokeWidth, tool, selectedShape, penType]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const previewCanvas = previewCanvasRef.current;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      const { width, height } = container.getBoundingClientRect();
      
      // Save current canvas content
      const imageData = ctxRef.current ? 
        ctxRef.current.getImageData(0, 0, canvas.width, canvas.height) : null;
      
      canvas.width = width;
      canvas.height = height;
      previewCanvas.width = width;
      previewCanvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;

      const previewCtx = previewCanvas.getContext('2d');
      previewCtx.lineCap = 'round';
      previewCtx.lineJoin = 'round';
      previewCtxRef.current = previewCtx;

      // Restore canvas content
      if (imageData) {
        ctx.putImageData(imageData, 0, 0);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const getLineDash = (type) => {
    switch (type) {
      case 'dashed':
        return [10, 10];
      case 'dotted':
        return [2, 5];
      default:
        return [];
    }
  };

  // Drawing events
  const startDrawing = ({ nativeEvent }) => {
    if (!socket?.connected || toolRef.current === 'select') return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;
    const previewCtx = previewCtxRef.current;
    
    setStartPos({ x: offsetX, y: offsetY });
    setDrawing(true);

    if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.strokeStyle = toolRef.current === 'eraser' ? '#fff' : colorRef.current;
      ctx.lineWidth = widthRef.current;
      ctx.setLineDash(getLineDash(penTypeRef.current));

      socket.emit('draw-start', {
        roomId,
        offsetX,
        offsetY,
        color: ctx.strokeStyle,
        strokeWidth: widthRef.current,
        tool: toolRef.current,
        penType: penTypeRef.current
      });
    } else if (toolRef.current === 'shape') {
      // Just set starting position for shapes
      previewCtx.strokeStyle = colorRef.current;
      previewCtx.lineWidth = widthRef.current;
      previewCtx.setLineDash([]);
    }
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || !socket?.connected) return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;
    const previewCtx = previewCtxRef.current;

    if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();

      socket.emit('draw-move', { roomId, offsetX, offsetY });
    } else if (toolRef.current === 'shape') {
      // Clear preview and draw shape preview
      const previewCanvas = previewCanvasRef.current;
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      
      previewCtx.strokeStyle = colorRef.current;
      previewCtx.lineWidth = widthRef.current;

      drawShape(previewCtx, startPos.x, startPos.y, offsetX, offsetY, shapeRef.current);
    }
  };

  const endDrawing = ({ nativeEvent }) => {
    if (!drawing || !socket?.connected) return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;
    const previewCtx = previewCtxRef.current;
    const previewCanvas = previewCanvasRef.current;

    if (toolRef.current === 'shape') {
      // Clear preview
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      
      // Draw final shape on main canvas
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = widthRef.current;
      ctx.setLineDash([]);

      drawShape(ctx, startPos.x, startPos.y, offsetX, offsetY, shapeRef.current);

      socket.emit('draw-shape', {
        roomId,
        shape: shapeRef.current,
        startX: startPos.x,
        startY: startPos.y,
        endX: offsetX,
        endY: offsetY,
        color: colorRef.current,
        strokeWidth: widthRef.current
      });
    } else if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.closePath();
      ctx.setLineDash([]);
      socket.emit('draw-end', { roomId });
    }

    setDrawing(false);
    if (onDrawEnd) onDrawEnd();
  };

  const drawShape = (ctx, x1, y1, x2, y2, shape) => {
    ctx.beginPath();
    
    switch (shape) {
      case 'rectangle':
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        break;
        
      case 'circle':
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'triangle':
        const midX = (x1 + x2) / 2;
        ctx.moveTo(midX, y1);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x2, y2);
        ctx.closePath();
        ctx.stroke();
        break;
        
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        break;
        
      case 'arrow':
        // Draw line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 15;
        
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle - Math.PI / 6),
          y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle + Math.PI / 6),
          y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
        break;
        
      default:
        break;
    }
  };

  // Incoming socket events
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleDrawStart = ({ offsetX, offsetY, color, strokeWidth, tool, penType }) => {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash(getLineDash(penType));
    };

    const handleDrawMove = ({ offsetX, offsetY }) => {
      const ctx = ctxRef.current;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    };

    const handleDrawEnd = () => {
      const ctx = ctxRef.current;
      ctx.closePath();
      ctx.setLineDash([]);
    };

    const handleDrawShape = ({ shape, startX, startY, endX, endY, color, strokeWidth }) => {
      const ctx = ctxRef.current;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.setLineDash([]);
      
      drawShape(ctx, startX, startY, endX, endY, shape);
    };

    const handleClearCanvas = () => {
      const canvas = canvasRef.current;
      ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    };

    socket.on('draw-start', handleDrawStart);
    socket.on('draw-move', handleDrawMove);
    socket.on('draw-end', handleDrawEnd);
    socket.on('draw-shape', handleDrawShape);
    socket.on('clear-canvas', handleClearCanvas);

    return () => {
      socket.off('draw-start', handleDrawStart);
      socket.off('draw-move', handleDrawMove);
      socket.off('draw-end', handleDrawEnd);
      socket.off('draw-shape', handleDrawShape);
      socket.off('clear-canvas', handleClearCanvas);
    };
  }, [socket, roomId]);

  return (
    <>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        className="absolute inset-0 z-10"
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      />
      {/* Preview canvas for shapes */}
      <canvas
        ref={previewCanvasRef}
        className="absolute inset-0 z-20 pointer-events-none"
      />
    </>
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;
