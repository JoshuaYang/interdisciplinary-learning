import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Download, RotateCcw, Upload, X } from 'lucide-react';
import { useChemStore } from '../../store/useChemStore';
import * as files from '../../engine/configFiles';

export const ConfigDialog: React.FC = () => {
  const open = useChemStore((s) => s.configDialogOpen);
  const setOpen = useChemStore((s) => s.setConfigDialogOpen);
  const sourceName = useChemStore((s) => s.sourceName);
  const config = useChemStore((s) => s.config);
  const validationReport = useChemStore((s) => s.validationReport);
  const importStageFiles = useChemStore((s) => s.importStageFiles);
  const reloadDefaultConfig = useChemStore((s) => s.reloadDefaultConfig);
  const showToast = useChemStore((s) => s.showToast);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExportCurrent = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'methane-bromination.current.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const handleExportStudents = () => {
    if (!config) return;
    files.extractStudents(config).forEach((item, index) => {
      setTimeout(() => {
        const blob = new Blob([JSON.stringify(item.doc, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = item.fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, index * 120);
    });
    showToast('已开始下载 6 个学生分子 JSON 文件。');
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content dialog-surface" aria-labelledby="config-title">
          <div className="dialog-header">
            <div>
              <span className="small-label">JSON 配置与校验</span>
              <Dialog.Title asChild>
                <h2 id="config-title">课堂配置管理</h2>
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" id="config-close" type="button" aria-label="关闭配置">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <p className="dialog-intro">
            学生只需编辑各自负责的分子 JSON（如 <code>CH4.json</code>、<code>Br2.json</code>），导入后程序会自动识别分子并更新全部七步反应动画。
          </p>

          <div
            className="file-drop"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <span className="file-symbol" aria-hidden="true">
              {'{ }'}
            </span>
            <strong>选择 CH4.json、CH3.json、Br2.json 等分子配置文件</strong>
            <span>支持一次选多个文件 · 浏览器本地解析，不会上传服务器</span>
            <button
              type="button"
              className="primary-button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload size={16} />
              <span>导入学生分子 JSON</span>
            </button>
            <input
              ref={fileInputRef}
              id="config-file"
              type="file"
              accept=".json,application/json"
              multiple
              hidden
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                importStageFiles(list);
                e.target.value = '';
              }}
            />
          </div>

          <div className="config-source">
            <span>当前配置来源</span>
            <strong id="config-source">{sourceName}</strong>
          </div>

          {validationReport && (
            <div
              id="validation-result"
              className={validationReport.accepted ? '' : 'error'}
              role="status"
            >
              <strong>
                {validationReport.accepted
                  ? '✓ 配置校验通过，已应用至当前场景。'
                  : '✗ 配置未通过校验，已保留原场景：'}
              </strong>
              {validationReport.errors.length > 0 && (
                <ul>
                  {validationReport.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
              {validationReport.warnings.length > 0 && (
                <ul>
                  {validationReport.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="dialog-actions">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                className="text-button top-action-btn"
                id="export-students"
                type="button"
                onClick={handleExportStudents}
              >
                <Download size={15} />
                <span>下载 6 个分子 JSON</span>
              </button>
              <button
                className="text-button top-action-btn"
                id="export-config"
                type="button"
                onClick={handleExportCurrent}
              >
                <Download size={15} />
                <span>导出完整配置</span>
              </button>
            </div>
            <button
              className="text-button top-action-btn"
              id="reset-config"
              type="button"
              onClick={() => reloadDefaultConfig()}
            >
              <RotateCcw size={15} />
              <span>恢复默认配置</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
