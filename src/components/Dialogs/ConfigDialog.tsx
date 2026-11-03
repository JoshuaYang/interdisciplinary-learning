import React, { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
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
        <Dialog.Content className="modal radix-dialog-content" aria-labelledby="config-title">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">JSON 配置与校验</span>
                <Dialog.Title asChild>
                  <h2 id="config-title">课堂配置管理</h2>
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="ghost-btn" id="config-close" type="button">
                  关闭
                </button>
              </Dialog.Close>
            </div>
            <p className="modal-copy">
              学生只需编辑各自负责的分子 JSON（如 <code>01-甲烷-CH4.json</code>
              ），导入后程序会自动识别分子并更新相关反应步骤。
            </p>
            <div className="config-actions">
              <label className="primary-btn file-btn" htmlFor="config-file">
                导入学生分子 JSON
              </label>
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
              <button
                className="ghost-btn"
                id="export-students"
                type="button"
                onClick={handleExportStudents}
              >
                下载 6 个分子 JSON
              </button>
              <button
                className="ghost-btn"
                id="export-config"
                type="button"
                onClick={handleExportCurrent}
              >
                导出完整配置
              </button>
              <button
                className="ghost-btn"
                id="reset-config"
                type="button"
                onClick={() => reloadDefaultConfig()}
              >
                恢复默认配置
              </button>
            </div>
            <div className="status-row">
              <span>当前配置来源：</span>
              <strong id="config-source">{sourceName}</strong>
            </div>
            <div className="validation-report" id="validation-report" aria-live="polite">
              {validationReport && (
                <>
                  <div className={`report-block ${validationReport.accepted ? 'ok' : 'err'}`}>
                    <strong>
                      {validationReport.accepted
                        ? '配置校验通过，已载入当前场景。'
                        : '配置未通过校验，已保留原场景。'}
                    </strong>
                    {validationReport.errors.length > 0 && (
                      <ul className="report-list">
                        {validationReport.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {validationReport.warnings.length > 0 && (
                    <div className="report-block warn">
                      <strong>化学参数提示（不影响载入）：</strong>
                      <ul className="report-list">
                        {validationReport.warnings.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
