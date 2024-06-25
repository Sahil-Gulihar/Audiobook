import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

function PDFReader() {
  const [pdfText, setPdfText] = useState('');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [file, setFile] = useState(null);
  const canvasRefs = useRef([]);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  }, []);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleStartPageChange = (event) => {
    setStartPage(event.target.value);
  };

  const handleEndPageChange = (event) => {
    setEndPage(event.target.value);
  };

  const renderPage = async (pdf, pageNum, index) => {
    const page = await pdf.getPage(pageNum);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = canvasRefs.current[index];
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    await page.render(renderContext).promise;
  };

  const handleLoad = async () => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file.');
      return;
    }

    const start = parseInt(startPage);
    const end = parseInt(endPage);

    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      alert('Please enter valid start and end page numbers.');
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(new Uint8Array(arrayBuffer)).promise;

    if (start > pdf.numPages) {
      alert('Start page number exceeds the total number of pages in the PDF.');
      return;
    }

    const validEnd = Math.min(end, pdf.numPages);
    const textContents = [];

    for (let i = start; i <= validEnd; i++) {
      await renderPage(pdf, i, i - start);
      const pdfPage = await pdf.getPage(i);
      const textContent = await pdfPage.getTextContent();
      const textItems = textContent.items;
      const finalString = textItems.map(item => item.str).join(' ');
      textContents.push(`Page ${i}: ${finalString}`);
    }

    setPdfText(textContents.join('\n\n'));
    convertToSpeech();
  };
  async function convertToSpeech() {
    const inputText = pdfText;
    const apiUrl = 'https://api-inference.huggingface.co/models/facebook/fastspeech2-en-ljspeech';
    const apiKey = import.meta.env.VITE_APIKEY;
   

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ inputs: inputText })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }
      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      setAudioUrl(url)
      
      }
        catch(err){
          console.log("Error: ", err)
        }


}


  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">PDF Reader and Text-to-Speech</h1>
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center mb-4">
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2 sm:mb-0 sm:mr-4">
              Upload PDF
            </label>
            <div className="flex-grow">
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                accept="application/pdf"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="start-page" className="block text-sm font-medium text-gray-700 mb-1">Start Page</label>
              <input
                id="start-page"
                type="number"
                placeholder="Start page"
                value={startPage}
                onChange={handleStartPageChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
            <div>
              <label htmlFor="end-page" className="block text-sm font-medium text-gray-700 mb-1">End Page</label>
              <input
                id="end-page"
                type="number"
                placeholder="End page"
                value={endPage}
                onChange={handleEndPageChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
              />
            </div>
          </div>
          <button
            onClick={handleLoad}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
          >
            Load and Convert
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">PDF Preview</h2>
          <div className="overflow-y-auto max-h-[800px] ">
            <div className="space-y-4">
              {Array.from({ length: parseInt(endPage) - parseInt(startPage) + 1 }, (_, index) => (
                <canvas
                  key={index}
                  ref={el => canvasRefs.current[index] = el}
                  className="flex justify-center"
                ></canvas>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Audio Playback</h2>
          {audioUrl ? (
            <audio
              controls
              src={audioUrl}
              className="w-full"
            ></audio>
          ) : (
            <p className="text-gray-500 text-center py-4">Loading audio...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PDFReader;
