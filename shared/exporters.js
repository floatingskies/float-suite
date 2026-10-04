/* =========================================================================
   FLOAT SUITE: Shared exporters (PDF, DOCX, ODT)
   Loads external libs lazily from CDN on first use:
   - jsPDF            https://cdnjs.cloudflare.com/ajax/libs/jspdf/...
   - docx             https://cdnjs.cloudflare.com/ajax/libs/docx/...
   - JSZip            https://cdnjs.cloudflare.com/ajax/libs/jszip/...
   Provides graceful fallbacks and a single `saveBlob` helper.
   ========================================================================= */
(function(global){
  'use strict';

  const CDN = {
    jspdf:  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    docx:   'https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.umd.cjs',
    jszip:  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
  };

  /* Bundled copies shipped with the suite: exports work fully offline.
     The CDN is only a fallback for odd packaging situations. */
  const VENDOR = {
    jspdf:  'shared/vendor/jspdf.umd.min.js',
    docx:   'shared/vendor/docx.umd.js',
    jszip:  'shared/vendor/jszip.min.js',
    html2canvas: 'shared/vendor/html2canvas.min.js'
  };

  const _loaded = {};
  function loadScript(src){
    if(_loaded[src]) return Promise.resolve(_loaded[src]);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => { _loaded[src] = true; resolve(); };
      s.onerror = () => reject(new Error('Failed to load '+src));
      document.head.appendChild(s);
    });
  }

  /* Load a bundled library, then fall back to the CDN if the local copy is missing. */
  function loadLib(name){
    const local = VENDOR[name];
    if(local) return loadScript(local).catch(() => loadScript(CDN[name]));
    return loadScript(CDN[name]);
  }
  function ensureHTML2Canvas(){
    if(global.html2canvas) return Promise.resolve(global.html2canvas);
    return loadLib('html2canvas').then(() => {
      if(!global.html2canvas) throw new Error('html2canvas not available');
      return global.html2canvas;
    });
  }

  function ensureJSPDF(){
    if(global.jspdf && global.jspdf.jsPDF) return Promise.resolve(global.jspdf.jsPDF);
    return loadLib('jspdf').then(() => {
      if(!global.jspdf || !global.jspdf.jsPDF) throw new Error('jsPDF not available');
      return global.jspdf.jsPDF;
    });
  }
  function ensureDocx(){
    if(global.docx) return Promise.resolve(global.docx);
    return loadLib('docx').then(() => {
      if(!global.docx) throw new Error('docx library not available');
      return global.docx;
    });
  }
  function ensureJSZip(){
    if(global.JSZip) return Promise.resolve(global.JSZip);
    return loadLib('jszip').then(() => {
      if(!global.JSZip) throw new Error('JSZip not available');
      return global.JSZip;
    });
  }

  function saveBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function sanitizeFilename(name, ext){
    let base = (name || 'document').trim().replace(/[\\/:*?"<>|]/g, '_');
    if(base.length > 80) base = base.slice(0,80);
    const dot = base.lastIndexOf('.');
    if(dot > 0) base = base.slice(0, dot);
    return base + '.' + ext;
  }

  /* ----- PDF: from canvas/image ------------------------------------- */
  /**
   * Export a canvas to a multi-page A4 PDF.
   * @param {HTMLCanvasElement} canvas
   * @param {string} filename
   * @param {object} opts { orientation:'portrait'|'landscape', margin_mm:10, background:'#fff' }
   */
  function canvasToPDF(canvas, filename, opts){
    opts = opts || {};
    const orientation = opts.orientation || 'portrait';
    const margin = opts.margin_mm != null ? opts.margin_mm : 10;
    const bg = opts.background || '#ffffff';

    return ensureJSPDF().then(jsPDF => {
      const pdf = new jsPDF({orientation, unit:'mm', format:'a4'});
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const availW = pageW - margin*2;
      const availH = pageH - margin*2;

      // Fill background
      pdf.setFillColor(bg);
      pdf.rect(0, 0, pageW, pageH, 'F');

      // Fit image to width, slice by height for multi-page
      const imgW = availW;
      const ratio = canvas.height / canvas.width;
      const imgH = imgW * ratio;

      // If fits in one page, just center it
      if(imgH <= availH){
        const offY = (pageH - imgH) / 2;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, offY, imgW, imgH);
      }else{
        // Slice the canvas vertically to fit pages
        const pageH_px = Math.floor(availH * (canvas.width / availW));
        let y = 0;
        let first = true;
        while(y < canvas.height){
          const sliceH = Math.min(pageH_px, canvas.height - y);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceH;
          const ctx = slice.getContext('2d');
          if(bg){
            ctx.fillStyle = bg;
            ctx.fillRect(0,0,slice.width,slice.height);
          }
          ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceH_mm = sliceH * (imgW / canvas.width);
          if(!first) pdf.addPage();
          pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imgW, sliceH_mm);
          first = false;
          y += sliceH;
        }
      }
      pdf.save(sanitizeFilename(filename, 'pdf'));
    });
  }

  /**
   * Export an SVG element to PDF (via rasterization).
   */
  function svgToPDF(svgEl, filename, opts){
    opts = opts || {};
    const scale = opts.scale || 2;
    const bg = opts.background || '#ffffff';
    const bbox = svgEl.getBoundingClientRect();
    const w = Math.max(1, Math.floor(bbox.width * scale));
    const h = Math.max(1, Math.floor(bbox.height * scale));
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([xml], {type:'image/svg+xml;charset=utf-8'});
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    return new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bg; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvasToPDF(canvas, filename, opts).then(resolve, reject);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  /* ----- DOCX: from HTML or structured content ---------------------- */
  /**
   * Convert a DOM element's HTML to a real .docx file.
   * Supports: headings (h1-h4), paragraphs, bold/italic/underline, lists,
   * tables, images (data URLs), horizontal rules, blockquotes.
   */
  function htmlToDocx(rootEl, filename, opts){
    opts = opts || {};
    const title = opts.title || (filename || 'Document').replace(/\.[^.]+$/, '');
    const author = opts.author || 'Float Suite';
    return ensureDocx().then(docx => {
      const {Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
             AlignmentType, BorderStyle, ImageRun, PageBreak, LevelFormat,
             WidthType, ShadingType, ExternalHyperlink} = docx;

      const children = [];

      // Optional title block
      if(opts.title){
        children.push(new Paragraph({
          heading: HeadingLevel.TITLE,
          children:[new TextRun({text:title, bold:true, size:48})],
          spacing:{after:240}
        }));
      }
      if(opts.subtitle){
        children.push(new Paragraph({
          alignment:AlignmentType.CENTER,
          children:[new TextRun({text:opts.subtitle, italics:true, size:24, color:'555555'})],
          spacing:{after:360}
        }));
      }

      /* Inline content of a block element -> TextRuns (keeps the paragraph intact) */
      function inlineRuns(node, ctx){
        const runs = [];
        function collect(el, style){
          el.childNodes.forEach(c => {
            if(c.nodeType === 3){
              if(c.textContent) runs.push(new TextRun(Object.assign({ text: c.textContent }, style)));
              return;
            }
            if(c.nodeType !== 1) return;
            const t = c.tagName.toLowerCase();
            if(t === 'br'){ runs.push(new TextRun({ text:'', break: 1 })); return; }
            if(t === 'b' || t === 'strong') return collect(c, Object.assign({}, style, { bold: true }));
            if(t === 'i' || t === 'em') return collect(c, Object.assign({}, style, { italics: true }));
            if(t === 'u') return collect(c, Object.assign({}, style, { underline: {} }));
            if(t === 's' || t === 'del' || t === 'strike') return collect(c, Object.assign({}, style, { strike: true }));
            if(t === 'sup') return collect(c, Object.assign({}, style, { superScript: true }));
            if(t === 'sub') return collect(c, Object.assign({}, style, { subScript: true }));
            if(t === 'a') return collect(c, Object.assign({}, style, { underline: {} }));
            collect(c, style);
          });
        }
        collect(node, {
          bold: !!ctx.bold, italics: !!ctx.italic,
          underline: ctx.underline ? {} : undefined,
          strike: !!ctx.strike,
          color: ctx.color,
          size: ctx.size ? ctx.size*2 : undefined,
          font: ctx.font
        });
        return runs;
      }

      function walk(node, ctx){
        ctx = ctx || {};
        node.childNodes.forEach(child => {
          if(child.nodeType === 3){ // loose text, not inside a paragraph
            const text = child.textContent;
            if(text && text.trim()){
              children.push(new Paragraph({
                children:[new TextRun({
                  text,
                  bold: !!ctx.bold, italics: !!ctx.italic,
                  underline: ctx.underline ? {} : undefined,
                  strike: !!ctx.strike,
                  color: ctx.color,
                  size: ctx.size ? ctx.size*2 : undefined,
                  font: ctx.font
                })],
                alignment: ctx.align || AlignmentType.LEFT,
                spacing:{after:120}
              }));
            }
            return;
          }
          if(child.nodeType !== 1) return;
          const tag = child.tagName.toLowerCase();
          switch(tag){
            case 'h1': children.push(new Paragraph({heading:HeadingLevel.HEADING_1, children:[new TextRun({text:child.textContent, bold:true})]})); break;
            case 'h2': children.push(new Paragraph({heading:HeadingLevel.HEADING_2, children:[new TextRun({text:child.textContent, bold:true})]})); break;
            case 'h3': children.push(new Paragraph({heading:HeadingLevel.HEADING_3, children:[new TextRun({text:child.textContent, bold:true})]})); break;
            case 'h4': children.push(new Paragraph({heading:HeadingLevel.HEADING_4, children:[new TextRun({text:child.textContent, bold:true})]})); break;
            case 'p':
              // One paragraph per <p> with the inline formatting kept as runs
              // inside it. Emitting one paragraph per text node used to shred
              // sentences into separate lines (and overlap them in Writer).
              {
                const runs = inlineRuns(child, ctx);
                if(runs.length || !child.textContent.trim()){
                  children.push(new Paragraph({
                    children: runs,
                    alignment: ctx.align || AlignmentType.LEFT,
                    spacing:{after:120}
                  }));
                }
              }
              break;
            case 'div':
              if(child.classList && child.classList.contains('page-break')){
                children.push(new Paragraph({children:[new PageBreak()]}));
              }else{
                walk(child, ctx);
              }
              break;
            case 'b': case 'strong': walk(child, Object.assign({}, ctx, {bold:true})); break;
            case 'i': case 'em':     walk(child, Object.assign({}, ctx, {italic:true})); break;
            case 'u':                walk(child, Object.assign({}, ctx, {underline:true})); break;
            case 's': case 'del':    walk(child, Object.assign({}, ctx, {strike:true})); break;
            case 'br': children.push(new Paragraph({})); break;
            case 'hr': children.push(new Paragraph({border:{bottom:{style:BorderStyle.SINGLE, size:6, color:'000000'}}})); break;
            case 'blockquote':
              child.childNodes.forEach(n => {
                if(n.nodeType === 3){
                  children.push(new Paragraph({
                    children:[new TextRun({text:n.textContent, italics:true, color:'555555'})],
                    indent:{left:720}, spacing:{after:120}
                  }));
                }else if(n.nodeType === 1){ walk(n, Object.assign({}, ctx, {italic:true, color:'555555'})); }
              });
              break;
            case 'ul':
              child.childNodes.forEach(li => {
                if(li.nodeType !== 1 || li.tagName.toLowerCase() !== 'li') return;
                children.push(new Paragraph({
                  children:[new TextRun({text:li.textContent})],
                  bullet:{level:0}, spacing:{after:60}
                }));
              });
              break;
            case 'ol':
              child.childNodes.forEach((li, idx) => {
                if(li.nodeType !== 1 || li.tagName.toLowerCase() !== 'li') return;
                children.push(new Paragraph({
                  children:[new TextRun({text:(idx+1)+'. '+li.textContent})],
                  indent:{left:720}, spacing:{after:60}
                }));
              });
              break;
            case 'img':{
              const src = child.getAttribute('src') || '';
              if(src.indexOf('data:') === 0){
                const m = src.match(/^data:image\/(\w+);base64,(.+)$/);
                if(m){
                  const raw = atob(m[2]);
                  const bytes = new Uint8Array(raw.length);
                  for(let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
                  const w = parseInt(child.getAttribute('width') || 400);
                  const h = parseInt(child.getAttribute('height') || 300);
                  children.push(new Paragraph({
                    children:[new ImageRun({data:bytes, transformation:{width:w, height:h}})],
                    spacing:{after:200}
                  }));
                }
              }
              break;
            }
            case 'a':{
              const href = child.getAttribute('href') || '';
              const text = child.textContent;
              if(href && text){
                children.push(new Paragraph({
                  children:[new ExternalHyperlink({
                    link:href,
                    children:[new TextRun({text, style:'Hyperlink', underline:{}, color:'0563C1'})]
                  })],
                  spacing:{after:120}
                }));
              }
              break;
            }
            case 'table':{
              const rows = [];
              child.querySelectorAll('tr').forEach(tr => {
                const cells = [];
                tr.querySelectorAll('th,td').forEach(td => {
                  cells.push(new TableCell({
                    children:[new Paragraph({children:[new TextRun({text:td.textContent, bold: td.tagName.toLowerCase()==='th'})]})]
                  }));
                });
                if(cells.length) rows.push(new TableRow({children:cells}));
              });
              if(rows.length) children.push(new Table({rows}));
              children.push(new Paragraph({spacing:{after:120}}));
              break;
            }
            case 'pre': case 'code':
              children.push(new Paragraph({
                children:[new TextRun({text:child.textContent, font:'Courier New', size:20, color:'000000'})],
                shading:{type:ShadingType.SOLID, color:'F4F4F4', fill:'F4F4F4'},
                spacing:{after:120}
              }));
              break;
            default:
              walk(child, ctx);
          }
        });
      }
      walk(rootEl);

      const doc = new Document({
        creator: author,
        title: title,
        description: opts.description || title,
        sections:[{properties:{}, children}]
      });

      return Packer.toBlob(doc).then(blob => {
        saveBlob(blob, sanitizeFilename(filename, 'docx'));
      });
    });
  }

  /* ----- ODT: minimal but valid ------------------------------------- */
  /**
   * Generate an .odt file (OpenDocument Text) from HTML.
   * Builds the required ODF package structure (mimetype, META-INF/manifest.xml,
   * content.xml, styles.xml) using JSZip. Body text + basic formatting.
   */
  function htmlToODT(rootEl, filename, opts){
    opts = opts || {};
    const title = opts.title || (filename || 'Document').replace(/\.[^.]+$/, '');
    return ensureJSZip().then(JSZip => {
      // Collect embedded (data URL) images so they can be stored in Pictures/
      const images = [];
      const imgNameBySrc = {};
      let imgIdx = 0;
      rootEl.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        const m = src.match(/^data:image\/(png|jpeg|jpg|gif);base64,.+$/);
        if(!m) return;
        if(imgNameBySrc[src] !== undefined){
          img.setAttribute('data-odt-img', imgNameBySrc[src]);
          const orig = images.find(im => im.name === imgNameBySrc[src]);
          const w = parseInt(img.getAttribute('width')||'',10) || (orig ? orig.w : 400);
          const h = parseInt(img.getAttribute('height')||'',10) || (orig ? orig.h : 300);
          img.setAttribute('data-odt-w', String(w));
          img.setAttribute('data-odt-h', String(h));
          return;
        }
        const type = m[1] === 'jpg' ? 'jpeg' : m[1];
        const raw = atob(src.split(',')[1]);
        const bytes = new Uint8Array(raw.length);
        for(let i=0;i<raw.length;i++) bytes[i] = raw.charCodeAt(i);
        const name = 'Pictures/image' + (++imgIdx) + '.' + (type === 'jpeg' ? 'jpg' : type);
        const w = parseInt(img.getAttribute('width')||img.naturalWidth||400,10)||400;
        const h = parseInt(img.getAttribute('height')||img.naturalHeight||300,10)||300;
        images.push({name, bytes, type, w, h});
        imgNameBySrc[src] = name;
        img.setAttribute('data-odt-img', name);
        img.setAttribute('data-odt-w', String(w));
        img.setAttribute('data-odt-h', String(h));
      });

      // Convert HTML to ODF content.xml body
      const bodyXML = htmlToODFXML(rootEl);

      const contentXML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  office:version="1.2">
  <office:automatic-styles/>
  <office:body>
    <office:text>
      <text:p text:style-name="Title">${escapeXML(title)}</text:p>
      ${bodyXML}
    </office:text>
  </office:body>
</office:document-content>`;

      const stylesXML = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  office:version="1.2">
  <office:styles>
    <style:style style:name="Title" style:family="paragraph">
      <style:text-properties fo:font-size="24pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Heading" style:family="paragraph">
      <style:text-properties fo:font-size="16pt" fo:font-weight="bold"/>
    </style:style>
    <style:style style:name="Body" style:family="paragraph">
      <style:text-properties fo:font-size="12pt"/>
      <style:paragraph-properties fo:line-height="150%" fo:margin-bottom="0.2cm"/>
    </style:style>
    <style:style style:name="Quote" style:family="paragraph">
      <style:paragraph-properties fo:margin-left="1cm" fo:font-style="italic"/>
    </style:style>
    <style:style style:name="PageBreak" style:family="paragraph">
      <style:paragraph-properties fo:break-before="page"/>
    </style:style>
  </office:styles>
</office:document-styles>`;

      const entries = images.map(im =>
        `  <manifest:file-entry manifest:media-type="image/${im.type}" manifest:full-path="${im.name}"/>`).join('\n');
      const manifestXML = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:media-type="application/vnd.oasis.opendocument.text" manifest:full-path="/"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="content.xml"/>
  <manifest:file-entry manifest:media-type="text/xml" manifest:full-path="styles.xml"/>
${entries}
</manifest:manifest>`;

      const zip = new JSZip();
      // mimetype must be the first file and uncompressed
      zip.file('mimetype', 'application/vnd.oasis.opendocument.text', {compression:'STORE'});
      images.forEach(im => zip.file(im.name, im.bytes));
      zip.file('META-INF/manifest.xml', manifestXML);
      zip.file('content.xml', contentXML);
      zip.file('styles.xml', stylesXML);

      return zip.generateAsync({type:'blob', mimeType:'application/vnd.oasis.opendocument.text'}).then(blob => {
        saveBlob(blob, sanitizeFilename(filename, 'odt'));
      });
    });
  }

  function escapeXML(s){
    return String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
  }

  function htmlToODFXML(root){
    const out = [];
    function walk(node){
      node.childNodes.forEach(child => {
        if(child.nodeType === 3){
          const text = child.textContent;
          if(text && text.trim()){
            out.push(`<text:p text:style-name="Body">${escapeXML(text)}</text:p>`);
          }
          return;
        }
        if(child.nodeType !== 1) return;
        const tag = child.tagName.toLowerCase();
        switch(tag){
          case 'h1': case 'h2': case 'h3': case 'h4':
            out.push(`<text:h text:style-name="Heading" text:outline-level="${tag[1]}">${escapeXML(child.textContent)}</text:h>`);
            break;
          case 'p':
            // Inline formatting
            out.push('<text:p text:style-name="Body">'+inlineODF(child)+'</text:p>');
            break;
          case 'ul':
            child.querySelectorAll(':scope > li').forEach(li => {
              out.push('<text:list-item><text:p text:style-name="Body">'+inlineODF(li)+'</text:p></text:list-item>');
            });
            out.push('<text:p text:style-name="Body"/>');
            break;
          case 'ol':
            child.querySelectorAll(':scope > li').forEach((li,idx) => {
              out.push(`<text:list-item><text:p text:style-name="Body">${idx+1}. ${inlineODF(li)}</text:p></text:list-item>`);
            });
            out.push('<text:p text:style-name="Body"/>');
            break;
          case 'blockquote':
            out.push('<text:p text:style-name="Quote">'+inlineODF(child)+'</text:p>');
            break;
          case 'hr':
            out.push('<text:p text:style-name="Body"/>');
            break;
          case 'br':
            out.push('<text:line-break/>');
            break;
          case 'div':
            // Page-break markers from the editor become real ODF page breaks
            if(child.classList && child.classList.contains('page-break')){
              out.push('<text:p text:style-name="PageBreak"/>');
            }else{
              walk(child);
            }
            break;
          case 'img':{
            const ds = child.getAttribute('data-odt-img');
            if(ds){
              const w = parseInt(child.getAttribute('data-odt-w'),10)||400;
              const h = parseInt(child.getAttribute('data-odt-h'),10)||300;
              out.push(`<text:p text:style-name="Body"><draw:frame text:anchor-type="paragraph" svg:width="${w}px" svg:height="${h}px"><draw:image xlink:href="${ds}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame></text:p>`);
            }
            break;
          }
          case 'table':
            out.push('<table:table>');
            child.querySelectorAll('tr').forEach(tr => {
              out.push('<table:table-row>');
              tr.querySelectorAll('th,td').forEach(td => {
                out.push(`<table:table-cell><text:p text:style-name="Body">${escapeXML(td.textContent)}</text:p></table:table-cell>`);
              });
              out.push('</table:table-row>');
            });
            out.push('</table:table>');
            break;
          default:
            walk(child);
        }
      });
    }
    function inlineODF(node){
      let s = '';
      node.childNodes.forEach(c => {
        if(c.nodeType === 3){ s += escapeXML(c.textContent); return; }
        if(c.nodeType !== 1) return;
        const t = c.tagName.toLowerCase();
        const inner = inlineODF(c);
        if(t==='b'||t==='strong') s += '<text:span text:style-name="Bold">'+inner+'</text:span>';
        else if(t==='i'||t==='em') s += '<text:span text:style-name="Italic">'+inner+'</text:span>';
        else if(t==='u') s += '<text:span text:style-name="Underline">'+inner+'</text:span>';
        else if(t==='br') s += '<text:line-break/>';
        else s += inner;
      });
      return s;
    }
    walk(root);
    return out.join('\n');
  }

  /* ----- Public API -------------------------------------------------- */
  global.FloatExport = {
    saveBlob, sanitizeFilename,
    canvasToPDF, svgToPDF,
    htmlToDocx, htmlToODT,
    ensureJSPDF, ensureDocx, ensureJSZip, ensureHTML2Canvas
  };

})(window);
