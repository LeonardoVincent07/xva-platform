import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodeDetails = {
  trades: {
    title: "Trades",
    subtitle: "Trade Service / Portfolio Service",
    fields: [
      "trade_header.trade_id",
      "trade_header.portfolio_id",
      "trade_header.counterparty_id",
      "trade_header.netting_set_id",
      "trade_header.product_type",
      "trade_header.notional",
      "trade_header.currency",
      "trade_header.maturity_date",
      "trade_cashflow_schedule.trade_id",
      "trade_cashflow_schedule.payment_date",
      "trade_cashflow_schedule.cashflow_amount",
    ],
    services: ["Trade Service", "Portfolio Service"],
    inputs: ["portfolio", "counterparty", "netting_set"],
    outputs: ["validated trade population", "cashflow schedule"],
    apis: [
      "GET /trades/{tradeId}",
      "GET /portfolios/{portfolioId}/trades",
      "GET /portfolios/{portfolioId}/xva-summary",
    ],
    calculations: ["trade population", "cashflow projection input", "portfolio aggregation"],
  },
  counterparty: {
    title: "Counterparty",
    subtitle: "Counterparty Service / Credit Curve Service",
    fields: [
      "counterparty.counterparty_id",
      "counterparty.legal_entity_id",
      "counterparty.rating",
      "counterparty.credit_curve_id",
      "counterparty.active_flag",
      "counterparty_credit_curve.curve_id",
      "credit_curve_point.tenor",
      "credit_curve_point.spread_bps",
    ],
    services: ["Counterparty Service", "Credit Curve Service"],
    inputs: ["legal_entity", "counterparty_credit_curve", "credit_curve_point"],
    outputs: ["counterparty credit profile", "default probability inputs"],
    apis: [
      "GET /counterparties/{counterpartyId}",
      "GET /counterparties/{counterpartyId}/credit-curve",
    ],
    calculations: ["credit spread lookup", "hazard rate input", "CVA grouping"],
  },
  netting: {
    title: "Netting / CSA",
    subtitle: "Netting Set Service / CSA Service",
    fields: [
      "netting_set.netting_set_id",
      "netting_set.counterparty_id",
      "netting_set.csa_id",
      "csa_agreement.csa_id",
      "csa_agreement.threshold_amount",
      "csa_agreement.minimum_transfer_amount",
      "csa_agreement.independent_amount",
      "collateral_account.account_id",
    ],
    services: ["Netting Set Service", "CSA Service", "Collateral Service"],
    inputs: ["netting_set", "csa_agreement", "collateral_account"],
    outputs: ["netting boundary", "collateral terms"],
    apis: ["GET /netting-sets/{nettingSetId}", "GET /csas/{csaId}"],
    calculations: ["exposure netting", "collateral adjustment", "FVA funding input"],
  },
  market: {
    title: "Market Data",
    subtitle: "Market Data Service / Curve Service",
    fields: [
      "market_curve_header.curve_id",
      "market_curve_header.currency",
      "market_curve_header.curve_type",
      "market_curve_point.curve_id",
      "market_curve_point.tenor",
      "market_curve_point.zero_rate",
      "fx_rate.currency_pair",
      "fx_rate.spot_rate",
    ],
    services: ["Market Data Service", "Curve Service"],
    inputs: ["market_curve_header", "market_curve_point", "fx_rate"],
    outputs: ["discount factors", "forward rates", "scenario inputs"],
    apis: ["GET /market-data/curves", "GET /market-data/curves/{curveId}"],
    calculations: ["discounting", "path inputs", "mark-to-market inputs"],
  },
  exposureEngine: {
    title: "Simulation + Exposure Engine",
    subtitle: "Simulation Service / Exposure Service",
    fields: [
      "simulation_run.run_id",
      "simulation_run.valuation_date",
      "simulation_run.path_count",
      "simulation_path.path_id",
      "simulation_path.run_id",
      "simulation_path.time_bucket",
      "exposure_profile_header.profile_id",
      "exposure_profile_time_bucket.expected_exposure",
      "exposure_profile_time_bucket.pfe_95",
      "exposure_profile_time_bucket.pfe_99",
    ],
    services: ["Simulation Service", "Exposure Service"],
    inputs: ["trade_header", "netting_set", "csa_agreement", "market_curve_point"],
    outputs: [
      "simulation_run",
      "simulation_path",
      "exposure_profile_header",
      "exposure_profile_time_bucket",
    ],
    apis: ["POST /simulation-runs", "GET /simulation-runs/{runId}", "GET /exposures/{nettingSetId}"],
    calculations: ["path generation", "mark-to-market by path", "EE", "PFE 95", "PFE 99"],
  },
  exposureProfiles: {
    title: "Exposure Profiles",
    subtitle: "Exposure Service / CVA Service",
    fields: [
      "exposure_profile_header.profile_id",
      "exposure_profile_header.simulation_run_id",
      "exposure_profile_header.netting_set_id",
      "exposure_profile_time_bucket.profile_id",
      "exposure_profile_time_bucket.bucket_date",
      "exposure_profile_time_bucket.expected_exposure",
      "exposure_profile_time_bucket.discounted_expected_exposure",
    ],
    services: ["Exposure Service", "CVA Service"],
    inputs: ["simulation_path", "trade_header", "netting_set", "csa_agreement"],
    outputs: ["exposure profile", "time-bucketed exposure"],
    apis: ["GET /exposures/{nettingSetId}", "GET /exposures/{profileId}/buckets"],
    calculations: ["EE curve", "PFE curve", "discounted exposure"],
  },
  curves: {
    title: "Credit / Discount / Funding Curves",
    subtitle: "Credit Curve Service / Market Data Service",
    fields: [
      "counterparty_credit_curve.curve_id",
      "credit_curve_point.curve_id",
      "credit_curve_point.tenor",
      "credit_curve_point.spread_bps",
      "discount_curve.curve_id",
      "discount_curve_point.discount_factor",
      "funding_curve.curve_id",
      "funding_curve_point.funding_spread_bps",
    ],
    services: ["Credit Curve Service", "Market Data Service", "Curve Service"],
    inputs: ["counterparty_credit_curve", "credit_curve_point", "discount_curve", "funding_curve"],
    outputs: ["valuation curves"],
    apis: [
      "GET /credit-curves/{curveId}",
      "GET /discount-curves/{curveId}",
      "GET /funding-curves/{curveId}",
    ],
    calculations: ["default probability", "hazard rate input", "discounting", "funding spread input"],
  },
  xvaEngine: {
    title: "XVA Engine",
    subtitle: "CVA Service / DVA Service / FVA Service",
    fields: [
      "cva_result_header.cva_result_id",
      "cva_result_header.exposure_profile_id",
      "cva_result_header.counterparty_id",
      "cva_result_bucket.cva_result_id",
      "cva_result_bucket.bucket_date",
      "cva_result_bucket.cva_amount",
      "dva_result_header.dva_result_id",
      "fva_result_header.fva_result_id",
    ],
    services: ["CVA Service", "DVA Service", "FVA Service"],
    inputs: ["exposure_profile_time_bucket", "credit_curve_point", "discount_curve", "funding_curve"],
    outputs: ["cva_result_header", "cva_result_bucket", "dva_result_header", "fva_result_header"],
    apis: ["POST /xva/calculate", "POST /xva/cva/calculate", "GET /xva/cva/summary"],
    calculations: ["CVA by bucket", "DVA", "FVA", "total XVA", "portfolio aggregation"],
  },
  results: {
    title: "Results",
    subtitle: "CVA Service / Desk Head Service",
    fields: [
      "cva_result_header.cva_result_id",
      "cva_result_header.portfolio_id",
      "cva_result_header.counterparty_id",
      "cva_result_header.total_cva",
      "cva_result_bucket.bucket_date",
      "cva_result_bucket.cva_amount",
    ],
    services: ["CVA Service", "Desk Head Service"],
    inputs: ["cva_result_header", "cva_result_bucket", "dva_result_header", "fva_result_header"],
    outputs: ["portfolio XVA", "counterparty XVA", "risk summary"],
    apis: ["GET /xva/cva/summary", "GET /screens/cva-risk/summary"],
    calculations: ["portfolio totals", "counterparty ranking", "risk thresholds"],
  },
  actions: {
    title: "Actions / Evidence",
    subtitle: "Sensitivity Service / Hedge Advisory Service / Evidence Service",
    fields: [
      "sensitivity_result.sensitivity_id",
      "sensitivity_result.risk_factor",
      "sensitivity_result.delta",
      "hedge_recommendation.recommendation_id",
      "hedge_recommendation.action_status",
      "murex_reconciliation_break.break_id",
      "murex_reconciliation_break.internal_result_id",
      "evidence_event.event_id",
      "evidence_event.calculation_run_id",
    ],
    services: ["Sensitivity Service", "Hedge Advisory Service", "Reconciliation Service", "Evidence Service"],
    inputs: ["cva_result_header", "sensitivity_result", "murex_xva_result"],
    outputs: ["desk actions", "reconciliation breaks", "evidence events"],
    apis: [
      "GET /sensitivities/{counterpartyId}",
      "GET /hedge-recommendations",
      "POST /reconciliation/murex/run",
      "GET /evidence/events/{calculationRunId}",
    ],
    calculations: ["risk factor ranking", "hedge priority", "Murex variance", "audit trace"],
  },
};

function ModelNode({ data, selected }) {
  return (
    <div
      className={`h-[108px] w-[230px] rounded-2xl border p-5 shadow-sm transition ${
        selected
          ? "border-emerald-500 bg-emerald-500/10 shadow-emerald-950/40"
          : "border-slate-700 bg-slate-900/85 hover:border-emerald-500/50"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-emerald-400 !bg-slate-950" />
      <div className="text-[15px] font-semibold leading-tight text-white">{data.title}</div>
      <div className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{data.subtitle}</div>
      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-emerald-400 !bg-slate-950" />
    </div>
  );
}

function DetailSection({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">{title}</div>
      <div className="space-y-1.5 text-sm leading-5 text-slate-200">
        {items.map((item) => (
          <div key={item}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ selected }) {
  return (
    <div className="h-[720px] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <div className="text-xl font-semibold text-white">{selected.title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-400">{selected.subtitle}</div>
      <DetailSection title="Fields" items={selected.fields} />
      <DetailSection title="Services" items={selected.services} />
      <DetailSection title="Inputs" items={selected.inputs} />
      <DetailSection title="Outputs" items={selected.outputs} />
      <DetailSection title="APIs" items={selected.apis} />
      <DetailSection title="Calculations" items={selected.calculations} />
    </div>
  );
}

const nodeTypes = { modelNode: ModelNode };

const graphNodes = [
  { id: "trades", type: "modelNode", position: { x: 0, y: 20 }, data: nodeDetails.trades },
  { id: "counterparty", type: "modelNode", position: { x: 0, y: 160 }, data: nodeDetails.counterparty },
  { id: "netting", type: "modelNode", position: { x: 0, y: 300 }, data: nodeDetails.netting },
  { id: "market", type: "modelNode", position: { x: 0, y: 440 }, data: nodeDetails.market },
  { id: "exposureEngine", type: "modelNode", position: { x: 360, y: 230 }, data: nodeDetails.exposureEngine },
  { id: "exposureProfiles", type: "modelNode", position: { x: 720, y: 120 }, data: nodeDetails.exposureProfiles },
  { id: "curves", type: "modelNode", position: { x: 720, y: 330 }, data: nodeDetails.curves },
  { id: "xvaEngine", type: "modelNode", position: { x: 1080, y: 225 }, data: nodeDetails.xvaEngine },
  { id: "results", type: "modelNode", position: { x: 1400, y: 225 }, data: nodeDetails.results },
  { id: "actions", type: "modelNode", position: { x: 1720, y: 225 }, data: nodeDetails.actions },
];

const edgeBase = {
  type: "smoothstep",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#10b981" },
  style: { stroke: "#10b981", strokeWidth: 2 },
};

const graphEdges = [
  { id: "trades-exposure", source: "trades", target: "exposureEngine", ...edgeBase },
  { id: "counterparty-exposure", source: "counterparty", target: "exposureEngine", ...edgeBase },
  { id: "netting-exposure", source: "netting", target: "exposureEngine", ...edgeBase },
  { id: "market-exposure", source: "market", target: "exposureEngine", ...edgeBase },
  { id: "exposure-engine-profile", source: "exposureEngine", target: "exposureProfiles", ...edgeBase },
  { id: "exposure-profile-xva", source: "exposureProfiles", target: "xvaEngine", ...edgeBase },
  { id: "curves-xva", source: "curves", target: "xvaEngine", ...edgeBase },
  { id: "xva-results", source: "xvaEngine", target: "results", ...edgeBase },
  { id: "results-actions", source: "results", target: "actions", ...edgeBase },
];

function SemanticModelGraph() {
  const [selectedNodeId, setSelectedNodeId] = useState("trades");
  const selected = nodeDetails[selectedNodeId] || nodeDetails.trades;

  const styledNodes = useMemo(
    () => graphNodes.map((node) => ({ ...node, selected: node.id === selectedNodeId })),
    [selectedNodeId]
  );

  return (
    <div className="grid grid-cols-12 gap-5">
      <div className="col-span-8 h-[720px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        <ReactFlow
          nodes={styledNodes}
          edges={graphEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView
          fitViewOptions={{ padding: 0.08 }}
          minZoom={0.25}
          maxZoom={1.1}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          className="bg-slate-950/30"
        >
          <Background color="#1e293b" gap={32} size={1} />
          <Controls showInteractive={false} className="!border !border-slate-700 !bg-slate-900 !shadow-none" />
        </ReactFlow>
      </div>

      <div className="col-span-4">
        <DetailPanel selected={selected} />
      </div>
    </div>
  );
}

export default function SemanticModelView() {
  return (
    <ReactFlowProvider>
      <SemanticModelGraph />
    </ReactFlowProvider>
  );
}
