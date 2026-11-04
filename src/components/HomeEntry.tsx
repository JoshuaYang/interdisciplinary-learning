import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Atom, Compass, FlaskConical, Layers, Sparkles } from 'lucide-react';
import { useFreeChemStore } from '../store/useFreeChemStore';

export const HomeEntry: React.FC = () => {
  const setAppMode = useFreeChemStore((s) => s.setAppMode);

  return (
    <div className="home-entry-shell">
      <header className="app-header">
        <div className="identity">
          <span className="mark" aria-hidden="true">
            <Atom size={22} strokeWidth={2} />
          </span>
          <div>
            <div className="identity-title-row">
              <h1>微观化学反应三维交互实验台</h1>
            </div>
            <p>
              化学 × 信息技术 <span>/</span> 分子构型与断键成键机理可视化平台
            </p>
          </div>
        </div>
      </header>

      <main className="home-entry-main">
        <div className="home-entry-container">
          <div className="home-hero">
            <span className="small-label">SELECT WORKBENCH MODE · 选择实验台模式</span>
            <h2>请选择要进入的实验模式</h2>
            <p>
              支持「甲烷自由基取代标准教学闯关」与「全周期自定义分子与反应阶段自由构建」双模式
            </p>
          </div>

          <div className="home-cards-grid">
            {/* 卡片 1：原有的定题闯关页面 */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24 }}
              className="home-mode-card guided-card"
              onClick={() => setAppMode('guided')}
            >
              <div className="home-card-top">
                <span className="home-card-icon guided">
                  <FlaskConical size={24} />
                </span>
                <span className="home-card-badge">标准教学闯关</span>
              </div>

              <h3>甲烷的自由基取代</h3>
              <p className="home-card-desc">
                围绕甲烷与溴单质的光照自由基取代反应，依次完成 6 种核心微粒配置核验、链引发/链增长/链终止反应序列拼装，以及 7 步三维反应机理推演问答。
              </p>

              <ul className="home-card-features">
                <li>
                  <Layers size={15} />
                  <span>内置 6 种标准微粒结构核验与 3D 球棍预览</span>
                </li>
                <li>
                  <Compass size={15} />
                  <span>四阶段反应链路拖拽装配与即时正误反馈</span>
                </li>
                <li>
                  <Atom size={15} />
                  <span>7 步三维断键成键动画与交互式机理推演闯关</span>
                </li>
              </ul>

              <button
                type="button"
                id="enter-guided-mode-btn"
                className="primary-button home-enter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppMode('guided');
                }}
              >
                <span>进入标准教学实验台</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>

            {/* 卡片 2：全新的自由反应实验台 */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.06 }}
              className="home-mode-card free-card"
              onClick={() => setAppMode('free')}
            >
              <div className="home-card-top">
                <span className="home-card-icon free">
                  <Sparkles size={24} />
                </span>
                <span className="home-card-badge accent">自由构建模式</span>
              </div>

              <h3>自由化学反应实验台</h3>
              <p className="home-card-desc">
                基于全周期元素周期表交互式搭建任意分子拓扑（或导入/导出 JSON），自由增减与命名反应阶段，全自动解算三维分子构型并生成分子靠近、断键重组与分离动画。
              </p>

              <ul className="home-card-features">
                <li>
                  <Sparkles size={15} />
                  <span>118 元素周期表点选连键 + 一键填入推荐构型与键长</span>
                </li>
                <li>
                  <Layers size={15} />
                  <span>动态增删反应阶段、自由命名并拖拽组合反应物与生成物</span>
                </li>
                <li>
                  <Atom size={15} />
                  <span>全自动原子配对追踪，生成三维结合、断键与分离动画</span>
                </li>
              </ul>

              <button
                type="button"
                id="enter-free-mode-btn"
                className="primary-button home-enter-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setAppMode('free');
                }}
              >
                <span>进入自由反应实验台</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};
