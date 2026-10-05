import * as THREE from 'three';
import { contacts, type DocumentSection } from './documents';

// A4 proportions, rendered locally: no remote fonts or generated images needed.
export function paperTexture(section: DocumentSection, index: number, portrait: HTMLImageElement) {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1414;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#edf1f4';
  ctx.fillRect(0, 0, 1000, 1414);
  // Very subtle paper grain, deterministic across loads.
  for (let y = 0; y < 1414; y += 3) {
    for (let x = 0; x < 1000; x += 3) {
      ctx.fillStyle = `rgba(52,69,88,${((x * 13 + y * 7) % 11) / 700})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const edgeShade = ctx.createRadialGradient(500, 620, 260, 500, 707, 860);
  edgeShade.addColorStop(0, 'rgba(28,48,69,0)');
  edgeShade.addColorStop(0.7, 'rgba(28,48,69,0.035)');
  edgeShade.addColorStop(1, 'rgba(28,48,69,0.20)');
  ctx.fillStyle = edgeShade;
  ctx.fillRect(0, 0, 1000, 1414);
  ctx.fillStyle = '#526a81';
  ctx.font = '500 20px Arial';
  ctx.fillText('IGOR ROBERTO FREITAS BARBOSA', 80, 88);
  ctx.fillStyle = '#172e43';
  ctx.font = `bold ${section.title.length > 16 ? 62 : 76}px Georgia`;
  ctx.fillText(section.title, 80, 190);
  ctx.fillStyle = '#b8c8d5';
  ctx.fillRect(80, 229, 840, 2);
  let start = 305;
  if (section.photo) {
    ctx.save();
    ctx.translate(677, 277);
    ctx.rotate(0.045);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#60738644';
    ctx.shadowBlur = 12;
    ctx.fillRect(-12, -12, 235, 255);
    ctx.shadowBlur = 0;
    ctx.drawImage(portrait, 0, 0, 211, 211);
    ctx.restore();
    ctx.fillStyle = '#60778c';
    ctx.font = 'italic 30px Georgia';
    ctx.fillText('Desenvolvedor de Software', 80, 346);
    ctx.fillText('FullStack', 80, 388);
    start = 603;
  }
  const lines = (text: string, size: number, bold = false) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial`;
    const result: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const word of paragraph.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > 840 && line) { result.push(line); line = word; }
        else line = next;
      }
      result.push(line);
    }
    return result;
  };
  let size = 32;
  const blocks = section.paragraphs.map(block => ({ ...block, text: block.href ? `${block.text}\n${block.href.replace('https://', '')}` : block.text }));
  if (section.photo) blocks.push({ heading: 'Contato', text: contacts.map(c => `${c.label}: ${c.text}`).join('\n') });
  const height = (fontSize: number) => blocks.reduce((total, block) => total + (block.heading ? lines(block.heading, fontSize + 5, true).length * (fontSize + 14) + 12 : 0) + lines(block.text, fontSize).length * (fontSize * 1.45) + 30, 0);
  while (height(size) > 1290 - start && size > 18) size--;
  let y = start;
  for (const block of blocks) {
    if (block.heading) {
      ctx.fillStyle = '#20374c';
      const wrapped = lines(block.heading, size + 5, true);
      for (const line of wrapped) { ctx.fillText(line, 80, y); y += size + 14; }
      y += 12;
    }
    ctx.fillStyle = '#445566';
    const wrapped = lines(block.text, size);
    for (const line of wrapped) { ctx.fillText(line, 80, y); y += size * 1.45; }
    y += 30;
  }
  ctx.fillStyle = '#718596';
  ctx.font = '22px Arial';
  ctx.fillText('PORTFÓLIO PESSOAL', 80, 1350);
  ctx.fillText(String(index + 1).padStart(2, '0'), 885, 1350);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
