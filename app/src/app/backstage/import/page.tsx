'use client';

import { useState, useRef } from 'react';
import { parseExcelWithImages } from '@/lib/excel-parser';

type ImportType = 'domestic' | 'international';

interface ParsedRow {
  [key: string]: string | number | null;
}

export default function ImportPage() {
  const [importType, setImportType] = useState<ImportType>('domestic');
  const [records, setRecords] = useState<ParsedRow[]>([]);
  const [images, setImages] = useState<Record<number, string>>({});
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<{ success?: boolean; inserted?: number; skipped?: number; error?: string } | null>(null);
  const [previewPage, setPreviewPage] = useState(1);
  const [dragging, setDragging] = useState(false);
  const previewPageSize = 20;
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setFileName(file.name);
    setResult(null);
    setProgress('解析 Excel 文件中...');
    setPreviewPage(1);

    try {
      const { records: parsed, images: extractedImages } = await parseExcelWithImages(file);
      setRecords(parsed);
      setImages(extractedImages);
      const imgCount = Object.keys(extractedImages).length;
      setProgress(imgCount > 0 ? `解析完成，提取到 ${imgCount} 张图片` : '解析完成，未找到嵌入图片');
    } catch (err) {
      setProgress('解析失败');
      console.error(err);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      await processFile(file);
    }
  };

  const handleImport = async () => {
    if (records.length === 0) return;
    setImporting(true);
    setResult(null);
    setProgress('导入数据中...');

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: importType,
          records,
          images,
        }),
      });
      const json = await res.json();
      setResult(json);
      if (json.success) {
        setRecords([]);
        setImages({});
        setFileName('');
        setProgress('');
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch {
      setResult({ error: '导入失败，请重试' });
    }
    setImporting(false);
  };

  const resetAll = () => {
    setRecords([]);
    setImages({});
    setFileName('');
    setProgress('');
    setResult(null);
    setPreviewPage(1);
    if (fileRef.current) fileRef.current.value = '';
  };

  const domesticHeaders = ['序号', '商标名', '类别', '价格(元)', '产品/服务', '群组', '注册日期', '商标编号'];
  const intlHeaders = ['序号', '国家/地区', '商标名', '释义', '商标号', '类别', '价格(元)', '注册日期', '中文小项'];
  const headers = importType === 'domestic' ? domesticHeaders : intlHeaders;
  const imgCount = Object.keys(images).length;

  return (
    <div className="flex flex-col h-[calc(100vh-40px)]">
      {/* Top section */}
      <div className="flex-shrink-0 space-y-3 mb-3">
        {/* Type selector + actions row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
              <button
                onClick={() => { setImportType('domestic'); resetAll(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  importType === 'domestic' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                国内商标
              </button>
              <button
                onClick={() => { setImportType('international'); resetAll(); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  importType === 'international' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                国际商标
              </button>
            </div>
            {fileName && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{fileName}</span>
                <span className="text-gray-300">|</span>
                <span>{records.length} 条记录</span>
                <span className="text-gray-300">|</span>
                <span>{imgCount} 张图片</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {fileName && (
              <button
                onClick={resetAll}
                className="px-2.5 py-1.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                重置
              </button>
            )}
            <button
              onClick={handleImport}
              disabled={importing || records.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {importing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-[1.5px] border-white border-t-transparent" />
                  导入中...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  导入 {records.length} 条记录
                </>
              )}
            </button>
          </div>
        </div>

        {/* Upload area or progress/result */}
        {!fileName ? (
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`relative bg-white rounded-lg border-2 border-dashed cursor-pointer transition-all ${
              dragging
                ? 'border-blue-400 bg-blue-50/50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/50'
            } py-10 flex flex-col items-center justify-center gap-2`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              dragging ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <svg className={`w-5 h-5 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-600">
                拖拽 Excel 文件到此处，或<span className="text-blue-500"> 点击选择文件</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">支持 .xlsx / .xls 格式</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Progress bar during import */}
            {importing && (
              <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-2">
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-[1.5px] border-blue-500 border-t-transparent" />
                <span className="text-xs font-medium text-gray-600">{progress}</span>
              </div>
            )}

            {/* Result message */}
            {result && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {result.success ? (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                )}
                <span className="font-medium">
                  {result.success
                    ? `导入成功！共导入 ${result.inserted} 条记录${result.skipped ? `，跳过 ${result.skipped} 条重复记录` : ''}`
                    : `导入失败：${result.error}`}
                </span>
              </div>
            )}

            {/* Image preview strip */}
            {imgCount > 0 && !importing && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                <span className="text-[11px] font-medium text-gray-500 flex-shrink-0">图片预览</span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {Object.entries(images).slice(0, 12).map(([idx, dataUrl]) => (
                    <div key={idx} className="w-8 h-8 flex-shrink-0 border border-gray-200 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img src={dataUrl} alt="" className="max-w-full max-h-full object-contain" />
                    </div>
                  ))}
                  {imgCount > 12 && (
                    <div className="w-8 h-8 flex-shrink-0 border border-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400 bg-gray-50">
                      +{imgCount - 12}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden file input for reset scenarios */}
        {fileName && (
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
        )}
      </div>

      {/* Preview table */}
      {records.length > 0 && (() => {
        const totalPreviewPages = Math.ceil(records.length / previewPageSize);
        const startIdx = (previewPage - 1) * previewPageSize;
        const endIdx = startIdx + previewPageSize;
        const pageRecords = records.slice(startIdx, endIdx);

        return (
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 w-20">图样</th>
                    {headers.map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRecords.map((row, i) => {
                    const realIdx = startIdx + i;
                    return (
                      <tr key={realIdx} className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}>
                        <td className="px-3 py-1.5">
                          {images[realIdx] ? (
                            <img src={images[realIdx]} alt="" className="w-14 h-14 object-contain rounded border border-gray-200 bg-white" />
                          ) : (
                            <div className="w-14 h-14 rounded border border-gray-200 bg-gray-50 flex items-center justify-center">
                              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                              </svg>
                            </div>
                          )}
                        </td>
                        {headers.map(h => (
                          <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-48 truncate text-gray-600">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination at bottom of table card */}
            <div className="flex-shrink-0 border-t border-gray-200 px-4 py-2.5 flex items-center justify-center gap-4 bg-white">
              <span className="text-[11px] text-gray-400">
                第 {startIdx + 1}-{Math.min(endIdx, records.length)} 条，共 {records.length} 条
              </span>
              {totalPreviewPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewPage(1)}
                    disabled={previewPage === 1}
                    className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                  >
                    首页
                  </button>
                  <button
                    onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                    disabled={previewPage === 1}
                    className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                  >
                    上一页
                  </button>
                  {Array.from({ length: Math.min(5, totalPreviewPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPreviewPages <= 5) {
                      pageNum = i + 1;
                    } else if (previewPage <= 3) {
                      pageNum = i + 1;
                    } else if (previewPage >= totalPreviewPages - 2) {
                      pageNum = totalPreviewPages - 4 + i;
                    } else {
                      pageNum = previewPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPreviewPage(pageNum)}
                        className={`w-7 h-7 text-[11px] rounded transition-colors ${
                          previewPage === pageNum
                            ? 'bg-blue-500 text-white border border-blue-500'
                            : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPreviewPage(p => Math.min(totalPreviewPages, p + 1))}
                    disabled={previewPage === totalPreviewPages}
                    className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                  >
                    下一页
                  </button>
                  <button
                    onClick={() => setPreviewPage(totalPreviewPages)}
                    disabled={previewPage === totalPreviewPages}
                    className="px-2 py-1 text-[11px] border border-gray-200 rounded hover:bg-gray-50 disabled:text-gray-300 transition-colors"
                  >
                    末页
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
