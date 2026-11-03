import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useChemStore } from '../../store/useChemStore';

export const HelpDialog: React.FC = () => {
  const open = useChemStore((s) => s.helpDialogOpen);
  const setOpen = useChemStore((s) => s.setHelpDialogOpen);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="modal radix-dialog-content" aria-labelledby="help-title">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <span className="eyebrow">操作指南</span>
                <Dialog.Title asChild>
                  <h2 id="help-title">课堂演示说明</h2>
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button className="ghost-btn" id="help-close" type="button">
                  关闭
                </button>
              </Dialog.Close>
            </div>
            <div className="help-grid">
              <div>
                <h3>第一步 · 分子核验</h3>
                <p>
                  上传或载入 6 种分子的 JSON 配置文件，系统自动核验化学式、空间构型、键长与键角。点击任意已通过的分子卡片可单独预览其 3D 结构。
                </p>
              </div>
              <div>
                <h3>第二步 · 反应链路拼装</h3>
                <p>
                  从微粒库拖拽或点击微粒放入对应方框，完成链引发、链传递（一）、链传递（二）以及链终止（3 条自由基偶联反应）四个阶段的装配。
                </p>
              </div>
              <div>
                <h3>第三步 · 三维机理推演</h3>
                <p>
                  左键拖拽旋转视角，右键或双指平移，滚轮缩放；点击原子可高亮查看其成键状态。完成右侧机理问答可逐步解锁全部 7 个反应步骤。
                </p>
              </div>
              <div>
                <h3>键盘快捷键</h3>
                <p>
                  空格键播放或暂停；左右方向键切换已解锁的步骤；Home 键回到第一步并重置视角。
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
