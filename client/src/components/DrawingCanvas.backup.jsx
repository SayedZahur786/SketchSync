import React, { useEffect, useRef, useState } from 'react';

const DrawingCanvas = ({ socket, roomId, color, strokeWidth, tool }) => {
  const canvasRef = useRef();
  const ctxRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const colorRef = useRef(color);
  const widthRef = useRef(strokeWidth);
  const toolRef = useRef(tool);

  // Update refs on prop change
  useEffect(() => {
    colorRef.current = color;
    widthRef.current = strokeWidth;
    toolRef.current = tool;
  }, [color, strokeWidth, tool]);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;

    const resizeCanvas = () => {
      const { width, height } = canvas.parentElement.getBoundingClientRect();
      
      // Save current canvas content
      const imageData = ctxRef.current ? ctxRef.current.getImageData(0, 0, canvas.width, canvas.height) : null;
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctxRef.current = ctx;

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

  // Drawing events
  const startDrawing = ({ nativeEvent }) => {
    if (!socket?.connected) return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;
    
    setStartPos({ x: offsetX, y: offsetY });
    setDrawing(true);

    if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.strokeStyle = toolRef.current === 'eraser' ? '#fff' : colorRef.current;
      ctx.lineWidth = widthRef.current;

      socket.emit('draw-start', {
        roomId,
        offsetX,
        offsetY,
        color: ctx.strokeStyle,
        strokeWidth: widthRef.current,
        tool: toolRef.current
      });
    }
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || !socket?.connected) return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;

    if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();

      socket.emit('draw-move', { roomId, offsetX, offsetY });
    } else if (toolRef.current === 'rectangle' || toolRef.current === 'circle') {
      // For shapes, we'll draw preview during dragging
      // This is a basic implementation - you can enhance it
    }
  };

  const endDrawing = ({ nativeEvent }) => {
    if (!drawing || !socket?.connected) return;

    const { offsetX, offsetY } = nativeEvent;
    const ctx = ctxRef.current;

    if (toolRef.current === 'rectangle') {
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = widthRef.current;
      ctx.strokeRect(
        startPos.x,
        startPos.y,
        offsetX - startPos.x,
        offsetY - startPos.y
      );

      socket.emit('draw-shape', {
        roomId,
        shape: 'rectangle',
        startX: startPos.x,
        startY: startPos.y,
        endX: offsetX,
        endY: offsetY,
        color: colorRef.current,
        strokeWidth: widthRef.current
      });
    } else if (toolRef.current === 'circle') {
      const radius = Math.sqrt(
        Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2)
      );
      
      ctx.strokeStyle = colorRef.current;
      ctx.lineWidth = widthRef.current;
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();

      socket.emit('draw-shape', {
        roomId,
        shape: 'circle',
        centerX: startPos.x,
        centerY: startPos.y,
        radius: radius,
        color: colorRef.current,
        strokeWidth: widthRef.current
      });
    } else if (toolRef.current === 'pen' || toolRef.current === 'eraser') {
      ctx.closePath();
      socket.emit('draw-end', { roomId });
    }

    setDrawing(false);
  };

  // Incoming socket events
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleDrawStart = ({ offsetX, offsetY, color, strokeWidth, tool }) => {
      const ctx = ctxRef.current;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
    };

    const handleDrawMove = ({ offsetX, offsetY }) => {
      const ctx = ctxRef.current;
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    };

    const handleDrawEnd = () => {
      ctxRef.current.closePath();
    };

    const handleDrawShape = ({ shape, startX, startY, endX, endY, centerX, centerY, radius, color, strokeWidth }) => {
      const ctx = ctxRef.current;
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;

      if (shape === 'rectangle') {
        ctx.strokeRect(startX, startY, endX - startX, endY - startY);
      } else if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
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
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      className="absolute inset-0 z-0 cursor-crosshair"
      style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
    />
  );
};

export default DrawingCanvas;
