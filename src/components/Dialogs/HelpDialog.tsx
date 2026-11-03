import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useChemStore } from '../../store/useChemStore';

export const HelpDialog: React.FC = () => {
  const open = useChemStore((s) => s.helpDialogOpen);
  const setOpen = useChemStore((s) => s.setHelpDialogOpen);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content dialog-surface" aria-labelledby="help-title">
          <div className="dialog-header">
            <div>
              <span className="small-label">操作指南</span>
              <Dialog.Title asChild>
                <h2 id="help-title">课堂实验与交互说明</h2>
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" id="help-close" type="button" aria-label="关闭说明">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <ol className="help-list">
            <li>
              <strong>第一步 · 分子结构核验与 3D 预览</strong>
              <p>
                上传或核验 6 种参与反应微粒的 JSON 配置文件，系统自动核验化学式、杂化方式、空间构型与键长键角。点击任意已通过的分子卡片可单独弹出其三维球棍模型并交互旋转。
              </p>
            </li>
            <li>
              <strong>第二步 · 微观反应链路拼装</strong>
              <p>
                从微粒池拖拽（或点击选中后放入）微粒至对应反应槽，依次完成「链引发」、「链传递（一）」、「链传递（二）」及「链终止（3 条自由基偶联反应）」四个阶段。
              </p>
            </li>
            <li>
              <strong>第三步 · 三维机理推演与原子追踪</strong>
              <p>
                左键拖拽旋转模型，滚轮或双指缩放，点击任意原子可高亮查看其成键状态与三维坐标。完成右侧反应机理推演问答即可逐步解锁全部 7 个步骤与连续播放。
              </p>
            </li>
          </ol>

          <div className="keyboard-help">
            <kbd>空格</kbd> 播放 / 暂停 <kbd>←</kbd>
            <kbd>→</kbd> 前后步骤切换 <kbd>Home</kbd> 回到初始步骤并复位视角
          </div>
          <p className="dialog-footnote">
            离线可用 · 键长单位 Å · 三维动画为微观反应机理示意
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
