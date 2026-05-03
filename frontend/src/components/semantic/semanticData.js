// Expanded target-state semantic architecture data. Static for demo; designed to be replaced by a /semantic-model API later.

export const capabilityTiles = [
  {
    "id": "semantic",
    "title": "Semantic Model",
    "status": "TARGET STATE",
    "description": "Target business and platform concepts mapped to services, data objects, calculation engines, APIs and frontend panels."
  },
  {
    "id": "data",
    "title": "Data Model",
    "status": "TARGET STATE",
    "description": "Target logical and physical model with field-level metadata, keys, constraints, indexes and ownership."
  },
  {
    "id": "services",
    "title": "Services",
    "status": "TARGET STATE",
    "description": "Target backend services with responsibilities, API contracts, reads, writes, producers, consumers and implementation status."
  },
  {
    "id": "technology",
    "title": "Technology Stack",
    "status": "IMPLEMENTED + TARGET",
    "description": "Implemented development stack plus target runtime, engineering controls and planned platform extensions."
  },
  {
    "id": "businessLineage",
    "title": "Business Data Lineage",
    "status": "PLACEHOLDER",
    "description": "Trace business data from trade capture through exposure, XVA, actioning and reconciliation."
  },
  {
    "id": "technologyLineage",
    "title": "Technology Component Lineage",
    "status": "PLACEHOLDER",
    "description": "Trace which panels, APIs, services, engines and tables are touched by each user action."
  },
  {
    "id": "quality",
    "title": "Quality Assurance",
    "status": "PLACEHOLDER",
    "description": "Surface test coverage, guardrail results, calculation checks and regression evidence for each semantic object."
  },
  {
    "id": "security",
    "title": "Security Posture",
    "status": "PLACEHOLDER",
    "description": "Expose authentication, authorisation, audit, secrets, API controls and data access status."
  }
]

export const semanticObjects = [
  {
    "name": "Trade",
    "type": "Business Object",
    "definition": "Atomic financial transaction subject to exposure simulation, valuation, lifecycle control and reconciliation.",
    "dependsOn": [
      "Counterparty",
      "Legal Entity",
      "Netting Set",
      "Product Definition",
      "Market Data"
    ],
    "producedBy": [
      "Trade Service"
    ],
    "consumedBy": [
      "Simulation Service",
      "Exposure Service",
      "CVA Service",
      "Reconciliation Service",
      "Exposure Overview Panel"
    ],
    "physicalTables": [
      "trade_header",
      "trade_economic_terms",
      "trade_cashflow_schedule",
      "trade_lifecycle_event"
    ],
    "implementation": "Partial"
  },
  {
    "name": "Counterparty",
    "type": "Reference Object",
    "definition": "External legal counterparty against which credit exposure, collateral terms, ratings and default risk are measured.",
    "dependsOn": [
      "Legal Entity",
      "Counterparty Credit Curve",
      "Rating Source"
    ],
    "producedBy": [
      "Counterparty Service"
    ],
    "consumedBy": [
      "Trade Service",
      "Netting Set Service",
      "CVA Service",
      "Hedge Advisory Service"
    ],
    "physicalTables": [
      "counterparty",
      "counterparty_rating_history",
      "counterparty_credit_curve"
    ],
    "implementation": "Partial"
  },
  {
    "name": "Legal Entity",
    "type": "Reference Object",
    "definition": "Internal or external legal entity used to organise ownership, booking, counterparty identity and contractual relationships.",
    "dependsOn": [
      "Jurisdiction",
      "LEI Registry",
      "Organisation Hierarchy"
    ],
    "producedBy": [
      "Legal Entity Service"
    ],
    "consumedBy": [
      "Counterparty Service",
      "Trade Service",
      "CSA Service",
      "Reconciliation Service"
    ],
    "physicalTables": [
      "legal_entity",
      "legal_entity_identifier",
      "legal_entity_hierarchy"
    ],
    "implementation": "Target"
  },
  {
    "name": "Netting Set",
    "type": "Risk Aggregation Object",
    "definition": "Legally enforceable aggregation boundary for trades that can be netted for exposure and XVA calculation.",
    "dependsOn": [
      "Counterparty",
      "CSA Agreement",
      "Trade"
    ],
    "producedBy": [
      "Netting Set Service"
    ],
    "consumedBy": [
      "Exposure Service",
      "CVA Service",
      "DVA Service",
      "FVA Service"
    ],
    "physicalTables": [
      "netting_set",
      "netting_set_trade_link",
      "netting_set_eligibility_rule"
    ],
    "implementation": "Partial"
  },
  {
    "name": "CSA Agreement",
    "type": "Legal / Collateral Object",
    "definition": "Collateral agreement defining threshold, minimum transfer amount, eligible collateral, margin frequency and dispute terms.",
    "dependsOn": [
      "Counterparty",
      "Legal Entity",
      "Collateral Account"
    ],
    "producedBy": [
      "CSA Service"
    ],
    "consumedBy": [
      "Collateral Service",
      "Exposure Service",
      "CVA Service"
    ],
    "physicalTables": [
      "csa_agreement",
      "csa_collateral_terms",
      "csa_threshold_schedule"
    ],
    "implementation": "Target"
  },
  {
    "name": "Collateral Account",
    "type": "Collateral Object",
    "definition": "Account-level representation of posted or received collateral balances, currencies, eligibility and haircuts.",
    "dependsOn": [
      "CSA Agreement",
      "Currency",
      "Valuation Date"
    ],
    "producedBy": [
      "Collateral Service"
    ],
    "consumedBy": [
      "Exposure Service",
      "FVA Service",
      "Desk Head Panel"
    ],
    "physicalTables": [
      "collateral_account",
      "collateral_balance",
      "collateral_valuation_event"
    ],
    "implementation": "Target"
  },
  {
    "name": "Market Curve",
    "type": "Market Data Object",
    "definition": "Bootstrapped market curve used for discounting, projection, credit spread and forward valuation.",
    "dependsOn": [
      "Market Data Source",
      "Curve Definition",
      "Curve Point"
    ],
    "producedBy": [
      "Market Data Service",
      "Curve Service"
    ],
    "consumedBy": [
      "Simulation Service",
      "Exposure Service",
      "CVA Service",
      "FVA Service"
    ],
    "physicalTables": [
      "market_curve_header",
      "market_curve_point",
      "market_data_source"
    ],
    "implementation": "Partial"
  },
  {
    "name": "FX Rate",
    "type": "Market Data Object",
    "definition": "Spot or forward exchange rate used to convert trade, exposure, collateral and XVA measures into reporting currency.",
    "dependsOn": [
      "Currency Pair",
      "Market Data Source",
      "Valuation Date"
    ],
    "producedBy": [
      "Market Data Service"
    ],
    "consumedBy": [
      "Trade Service",
      "Exposure Service",
      "Portfolio Aggregation Service"
    ],
    "physicalTables": [
      "fx_rate",
      "fx_forward_point",
      "currency"
    ],
    "implementation": "Target"
  },
  {
    "name": "Vol Surface",
    "type": "Market Data Object",
    "definition": "Option-implied volatility structure used by simulation, path generation and valuation models.",
    "dependsOn": [
      "Market Data Source",
      "Surface Definition",
      "Moneyness",
      "Tenor"
    ],
    "producedBy": [
      "Market Data Service"
    ],
    "consumedBy": [
      "Simulation Service",
      "Exposure Service"
    ],
    "physicalTables": [
      "vol_surface_header",
      "vol_surface_point"
    ],
    "implementation": "Target"
  },
  {
    "name": "Simulation Path",
    "type": "Calculation Object",
    "definition": "Scenario-specific projected market state across future time buckets for rates, FX, credit and other risk factors.",
    "dependsOn": [
      "Market Curve",
      "FX Rate",
      "Vol Surface",
      "Simulation Configuration"
    ],
    "producedBy": [
      "Simulation Service",
      "Monte Carlo Engine"
    ],
    "consumedBy": [
      "Exposure Service",
      "CVA Service",
      "Evidence Service"
    ],
    "physicalTables": [
      "simulation_run",
      "simulation_path",
      "simulation_path_market_state"
    ],
    "implementation": "Partial"
  },
  {
    "name": "Exposure Profile",
    "type": "Risk Measure",
    "definition": "Time-bucketed projected exposure for a netting set under simulated market scenarios and collateral terms.",
    "dependsOn": [
      "Trade",
      "Netting Set",
      "CSA Agreement",
      "Market Curve",
      "Simulation Path"
    ],
    "producedBy": [
      "Simulation Service",
      "Exposure Service"
    ],
    "consumedBy": [
      "CVA Service",
      "DVA Service",
      "FVA Service",
      "Desk Head Panel",
      "Reconciliation Service"
    ],
    "physicalTables": [
      "exposure_profile_header",
      "exposure_profile_time_bucket",
      "exposure_scenario_path",
      "exposure_calculation_run"
    ],
    "implementation": "Partial"
  },
  {
    "name": "CVA Result",
    "type": "XVA Measure",
    "definition": "Credit valuation adjustment derived from positive exposure, default probability, loss given default and discounting.",
    "dependsOn": [
      "Exposure Profile",
      "Counterparty Credit Curve",
      "Discount Curve",
      "LGD Assumption"
    ],
    "producedBy": [
      "CVA Service"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Desk Head Panel",
      "Evidence Service",
      "Reconciliation Service"
    ],
    "physicalTables": [
      "cva_result_header",
      "cva_result_bucket",
      "cva_result_driver"
    ],
    "implementation": "Partial"
  },
  {
    "name": "DVA Result",
    "type": "XVA Measure",
    "definition": "Debit valuation adjustment derived from own default risk and negative exposure profile.",
    "dependsOn": [
      "Negative Exposure Profile",
      "Own Credit Curve",
      "Discount Curve"
    ],
    "producedBy": [
      "DVA Service"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Portfolio Summary Panel",
      "Evidence Service"
    ],
    "physicalTables": [
      "dva_result_header",
      "dva_result_bucket"
    ],
    "implementation": "Target"
  },
  {
    "name": "FVA Result",
    "type": "XVA Measure",
    "definition": "Funding valuation adjustment derived from collateral, funding spreads, exposure and discounting assumptions.",
    "dependsOn": [
      "Exposure Profile",
      "CSA Agreement",
      "Funding Curve",
      "Collateral Account"
    ],
    "producedBy": [
      "FVA Service"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Treasury View",
      "Evidence Service"
    ],
    "physicalTables": [
      "fva_result_header",
      "fva_result_bucket",
      "funding_curve_point"
    ],
    "implementation": "Target"
  },
  {
    "name": "Sensitivity",
    "type": "Risk Measure",
    "definition": "First-order and second-order movement of XVA measures against market, credit and funding risk factors.",
    "dependsOn": [
      "CVA Result",
      "Market Curve",
      "Credit Curve",
      "Simulation Run"
    ],
    "producedBy": [
      "Sensitivity Service"
    ],
    "consumedBy": [
      "Hedge Advisory Service",
      "Desk Head Panel",
      "Risk Limit Service"
    ],
    "physicalTables": [
      "sensitivity_result",
      "sensitivity_factor",
      "sensitivity_shock_set"
    ],
    "implementation": "Target"
  },
  {
    "name": "Hedge Recommendation",
    "type": "Decision Object",
    "definition": "Actionable desk recommendation generated from XVA movement, sensitivities, thresholds, portfolio limits and rationale.",
    "dependsOn": [
      "CVA Result",
      "Sensitivity",
      "Risk Appetite",
      "Desk Limit"
    ],
    "producedBy": [
      "Hedge Advisory Service"
    ],
    "consumedBy": [
      "Desk Head Panel",
      "Evidence Service",
      "Action Queue"
    ],
    "physicalTables": [
      "hedge_recommendation",
      "hedge_recommendation_rationale",
      "desk_action_queue"
    ],
    "implementation": "Partial"
  },
  {
    "name": "Reconciliation Break",
    "type": "Control Object",
    "definition": "Explained difference between M7 XVA result and external Murex or source-system result.",
    "dependsOn": [
      "Trade",
      "Netting Set",
      "XVA Result",
      "External Murex Result"
    ],
    "producedBy": [
      "Reconciliation Service"
    ],
    "consumedBy": [
      "Murex Reconciliation Panel",
      "Evidence Service",
      "QA Dashboard"
    ],
    "physicalTables": [
      "reconciliation_run",
      "reconciliation_break",
      "reconciliation_break_classification"
    ],
    "implementation": "Target"
  },
  {
    "name": "Calculation Run",
    "type": "Evidence Object",
    "definition": "Immutable execution record for simulation, exposure, XVA, sensitivity or reconciliation calculations.",
    "dependsOn": [
      "Run Configuration",
      "Service Version",
      "Input Snapshot"
    ],
    "producedBy": [
      "Evidence Service"
    ],
    "consumedBy": [
      "Semantic Architecture Panel",
      "QA Panel",
      "Audit View"
    ],
    "physicalTables": [
      "calculation_run",
      "calculation_run_input",
      "calculation_run_output"
    ],
    "implementation": "Target"
  },
  {
    "name": "Evidence Record",
    "type": "Evidence Object",
    "definition": "System-generated trace proving which inputs, services, code paths, controls and outputs were involved in an action.",
    "dependsOn": [
      "Calculation Run",
      "Semantic Object",
      "Service",
      "API Contract"
    ],
    "producedBy": [
      "Evidence Service",
      "Semantic Metadata Service"
    ],
    "consumedBy": [
      "MissionAtlas Panel",
      "Quality Assurance",
      "Security Posture"
    ],
    "physicalTables": [
      "evidence_event",
      "evidence_artifact",
      "semantic_object_lineage"
    ],
    "implementation": "Target"
  }
]

export const dataTables = [
  {
    "table": "trade_header",
    "logicalEntity": "Trade",
    "owner": "Trade Service",
    "description": "Canonical trade identity, ownership, lifecycle status and primary economic classification.",
    "fields": [
      {
        "name": "trade_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "Internal immutable trade identifier."
      },
      {
        "name": "external_trade_id",
        "type": "VARCHAR(64)",
        "nullable": false,
        "key": "UK",
        "references": null,
        "description": "External source-system trade reference."
      },
      {
        "name": "source_system",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Originating platform, for example Murex or internal booking system."
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "Legal counterparty."
      },
      {
        "name": "netting_set_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "netting_set.netting_set_id",
        "description": "Netting set for exposure aggregation."
      },
      {
        "name": "booking_entity_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "legal_entity.legal_entity_id",
        "description": "Internal booking entity."
      },
      {
        "name": "product_type",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Instrument family, for example IRS, FXFWD, CCS."
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "Primary trade currency."
      },
      {
        "name": "notional",
        "type": "NUMERIC(22,2)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Trade notional amount."
      },
      {
        "name": "trade_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "trade date"
      },
      {
        "name": "effective_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "effective date"
      },
      {
        "name": "maturity_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "maturity date"
      },
      {
        "name": "lifecycle_status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "ACTIVE, MATURED, CANCELLED, TERMINATED."
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_trade_counterparty_id",
      "idx_trade_netting_set_id",
      "idx_trade_maturity_date",
      "uk_trade_source_external"
    ],
    "constraints": [
      "notional > 0",
      "lifecycle_status IN ('ACTIVE','MATURED','CANCELLED','TERMINATED')"
    ]
  },
  {
    "table": "trade_cashflow_schedule",
    "logicalEntity": "Trade Cashflow",
    "owner": "Trade Service",
    "description": "Target cashflow schedule for rate, FX and cross-currency products.",
    "fields": [
      {
        "name": "cashflow_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "cashflow id"
      },
      {
        "name": "trade_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "trade_header.trade_id",
        "description": "trade id"
      },
      {
        "name": "leg_id",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "leg id"
      },
      {
        "name": "payment_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "payment date"
      },
      {
        "name": "accrual_start_date",
        "type": "DATE",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "accrual start date"
      },
      {
        "name": "accrual_end_date",
        "type": "DATE",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "accrual end date"
      },
      {
        "name": "pay_receive",
        "type": "VARCHAR(8)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "pay receive"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "amount",
        "type": "NUMERIC(22,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "amount"
      },
      {
        "name": "rate_index",
        "type": "VARCHAR(40)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "rate index"
      },
      {
        "name": "fixed_rate",
        "type": "NUMERIC(16,10)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "fixed rate"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_cashflow_trade_id",
      "idx_cashflow_payment_date"
    ],
    "constraints": [
      "pay_receive IN ('PAY','RECEIVE')"
    ]
  },
  {
    "table": "counterparty",
    "logicalEntity": "Counterparty",
    "owner": "Counterparty Service",
    "description": "Canonical counterparty reference data, identity, rating and risk classification.",
    "fields": [
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "counterparty id"
      },
      {
        "name": "legal_entity_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "legal_entity.legal_entity_id",
        "description": "legal entity id"
      },
      {
        "name": "counterparty_code",
        "type": "VARCHAR(32)",
        "nullable": false,
        "key": "UK",
        "references": null,
        "description": "counterparty code"
      },
      {
        "name": "display_name",
        "type": "VARCHAR(120)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "display name"
      },
      {
        "name": "lei",
        "type": "VARCHAR(20)",
        "nullable": true,
        "key": "UK",
        "references": null,
        "description": "lei"
      },
      {
        "name": "country_of_risk",
        "type": "CHAR(2)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "country of risk"
      },
      {
        "name": "sector",
        "type": "VARCHAR(60)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "sector"
      },
      {
        "name": "internal_rating",
        "type": "VARCHAR(12)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "internal rating"
      },
      {
        "name": "default_lgd",
        "type": "NUMERIC(8,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "default lgd"
      },
      {
        "name": "active_flag",
        "type": "BOOLEAN",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "active flag"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_counterparty_lei",
      "idx_counterparty_rating"
    ],
    "constraints": [
      "default_lgd >= 0 AND default_lgd <= 1"
    ]
  },
  {
    "table": "counterparty_credit_curve",
    "logicalEntity": "Counterparty Credit Curve",
    "owner": "Counterparty Service",
    "description": "Counterparty credit spread term structure used for CVA default probability calculation.",
    "fields": [
      {
        "name": "credit_curve_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "credit curve id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "tenor_label",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "tenor label"
      },
      {
        "name": "maturity_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "maturity date"
      },
      {
        "name": "spread_bps",
        "type": "NUMERIC(12,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "spread bps"
      },
      {
        "name": "hazard_rate",
        "type": "NUMERIC(14,10)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "hazard rate"
      },
      {
        "name": "source_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "market_data_source.source_id",
        "description": "source id"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_credit_curve_counterparty_date",
      "idx_credit_curve_maturity"
    ],
    "constraints": [
      "spread_bps >= 0"
    ]
  },
  {
    "table": "legal_entity",
    "logicalEntity": "Legal Entity",
    "owner": "Legal Entity Service",
    "description": "Internal and external legal entity master used for ownership, booking and contract relationships.",
    "fields": [
      {
        "name": "legal_entity_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "legal entity id"
      },
      {
        "name": "legal_entity_name",
        "type": "VARCHAR(160)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "legal entity name"
      },
      {
        "name": "lei",
        "type": "VARCHAR(20)",
        "nullable": true,
        "key": "UK",
        "references": null,
        "description": "lei"
      },
      {
        "name": "entity_type",
        "type": "VARCHAR(30)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "entity type"
      },
      {
        "name": "jurisdiction",
        "type": "CHAR(2)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "jurisdiction"
      },
      {
        "name": "parent_legal_entity_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "legal_entity.legal_entity_id",
        "description": "parent legal entity id"
      },
      {
        "name": "active_flag",
        "type": "BOOLEAN",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "active flag"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_legal_entity_lei",
      "idx_legal_entity_parent"
    ],
    "constraints": [
      "entity_type IN ('INTERNAL','EXTERNAL','BRANCH','FUND')"
    ]
  },
  {
    "table": "netting_set",
    "logicalEntity": "Netting Set",
    "owner": "Netting Set Service",
    "description": "Legally enforceable exposure aggregation boundary.",
    "fields": [
      {
        "name": "netting_set_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "netting set id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "csa_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "csa_agreement.csa_id",
        "description": "csa id"
      },
      {
        "name": "netting_set_code",
        "type": "VARCHAR(50)",
        "nullable": false,
        "key": "UK",
        "references": null,
        "description": "netting set code"
      },
      {
        "name": "legal_agreement_ref",
        "type": "VARCHAR(80)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "legal agreement ref"
      },
      {
        "name": "base_currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "base currency"
      },
      {
        "name": "netting_enforceable_flag",
        "type": "BOOLEAN",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "netting enforceable flag"
      },
      {
        "name": "effective_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "effective date"
      },
      {
        "name": "termination_date",
        "type": "DATE",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "termination date"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_netting_counterparty",
      "idx_netting_csa"
    ],
    "constraints": [
      "termination_date IS NULL OR termination_date >= effective_date"
    ]
  },
  {
    "table": "csa_agreement",
    "logicalEntity": "CSA Agreement",
    "owner": "CSA Service",
    "description": "Collateral terms governing margining, thresholds, eligible collateral and valuation frequency.",
    "fields": [
      {
        "name": "csa_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "csa id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "agreement_ref",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": "UK",
        "references": null,
        "description": "agreement ref"
      },
      {
        "name": "base_currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "base currency"
      },
      {
        "name": "threshold_amount",
        "type": "NUMERIC(22,2)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "threshold amount"
      },
      {
        "name": "minimum_transfer_amount",
        "type": "NUMERIC(22,2)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "minimum transfer amount"
      },
      {
        "name": "independent_amount",
        "type": "NUMERIC(22,2)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "independent amount"
      },
      {
        "name": "margin_frequency",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "margin frequency"
      },
      {
        "name": "collateral_call_time",
        "type": "TIME",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "collateral call time"
      },
      {
        "name": "dispute_resolution_days",
        "type": "INTEGER",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "dispute resolution days"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_csa_counterparty",
      "uk_csa_agreement_ref"
    ],
    "constraints": [
      "minimum_transfer_amount >= 0",
      "threshold_amount >= 0"
    ]
  },
  {
    "table": "collateral_account",
    "logicalEntity": "Collateral Account",
    "owner": "Collateral Service",
    "description": "Collateral balances, eligibility and valuation status by CSA and currency.",
    "fields": [
      {
        "name": "collateral_account_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "collateral account id"
      },
      {
        "name": "csa_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "csa_agreement.csa_id",
        "description": "csa id"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "balance_amount",
        "type": "NUMERIC(22,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "balance amount"
      },
      {
        "name": "haircut_pct",
        "type": "NUMERIC(8,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "haircut pct"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "posted_received",
        "type": "VARCHAR(10)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "posted received"
      },
      {
        "name": "eligibility_status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "eligibility status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_collateral_csa",
      "idx_collateral_valuation_date"
    ],
    "constraints": [
      "haircut_pct >= 0 AND haircut_pct <= 1",
      "posted_received IN ('POSTED','RECEIVED')"
    ]
  },
  {
    "table": "market_curve_header",
    "logicalEntity": "Market Curve",
    "owner": "Market Data Service",
    "description": "Curve header for discount, projection, credit, funding and basis curves.",
    "fields": [
      {
        "name": "curve_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "curve id"
      },
      {
        "name": "curve_name",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "curve name"
      },
      {
        "name": "curve_type",
        "type": "VARCHAR(30)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "curve type"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": true,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "source_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "market_data_source.source_id",
        "description": "source id"
      },
      {
        "name": "bootstrap_method",
        "type": "VARCHAR(40)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "bootstrap method"
      },
      {
        "name": "interpolation_method",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "interpolation method"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_curve_name_date",
      "idx_curve_type_currency"
    ],
    "constraints": [
      "status IN ('VALIDATED','PROVISIONAL','REJECTED')"
    ]
  },
  {
    "table": "market_curve_point",
    "logicalEntity": "Market Curve Point",
    "owner": "Market Data Service",
    "description": "Point-level curve term structure values.",
    "fields": [
      {
        "name": "curve_point_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "curve point id"
      },
      {
        "name": "curve_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "market_curve_header.curve_id",
        "description": "curve id"
      },
      {
        "name": "tenor_label",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "tenor label"
      },
      {
        "name": "maturity_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "maturity date"
      },
      {
        "name": "zero_rate",
        "type": "NUMERIC(16,10)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "zero rate"
      },
      {
        "name": "discount_factor",
        "type": "NUMERIC(18,12)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "discount factor"
      },
      {
        "name": "spread_bps",
        "type": "NUMERIC(12,6)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "spread bps"
      },
      {
        "name": "source_quote_id",
        "type": "VARCHAR(80)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "source quote id"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_curve_point_curve",
      "idx_curve_point_maturity"
    ],
    "constraints": [
      "discount_factor IS NULL OR discount_factor > 0"
    ]
  },
  {
    "table": "fx_rate",
    "logicalEntity": "FX Rate",
    "owner": "Market Data Service",
    "description": "Spot and forward FX observations used for conversion and scenario generation.",
    "fields": [
      {
        "name": "fx_rate_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "fx rate id"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "base_currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "base currency"
      },
      {
        "name": "quote_currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "quote currency"
      },
      {
        "name": "tenor_label",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "tenor label"
      },
      {
        "name": "rate",
        "type": "NUMERIC(20,10)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "rate"
      },
      {
        "name": "source_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "market_data_source.source_id",
        "description": "source id"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_fx_pair_date",
      "idx_fx_tenor"
    ],
    "constraints": [
      "rate > 0",
      "base_currency <> quote_currency"
    ]
  },
  {
    "table": "vol_surface_point",
    "logicalEntity": "Vol Surface Point",
    "owner": "Market Data Service",
    "description": "Point-level implied volatility data for path generation and optional valuation models.",
    "fields": [
      {
        "name": "vol_point_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "vol point id"
      },
      {
        "name": "surface_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "vol_surface_header.surface_id",
        "description": "surface id"
      },
      {
        "name": "expiry_tenor",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "expiry tenor"
      },
      {
        "name": "underlying_tenor",
        "type": "VARCHAR(20)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "underlying tenor"
      },
      {
        "name": "strike",
        "type": "NUMERIC(20,10)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "strike"
      },
      {
        "name": "moneyness",
        "type": "NUMERIC(12,8)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "moneyness"
      },
      {
        "name": "implied_vol",
        "type": "NUMERIC(12,8)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "implied vol"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_vol_surface_point",
      "idx_vol_expiry"
    ],
    "constraints": [
      "implied_vol >= 0"
    ]
  },
  {
    "table": "simulation_run",
    "logicalEntity": "Simulation Run",
    "owner": "Simulation Service",
    "description": "Execution header for path generation and scenario simulation.",
    "fields": [
      {
        "name": "simulation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "simulation run id"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "run_label",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "run label"
      },
      {
        "name": "model_name",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "model name"
      },
      {
        "name": "model_version",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "model version"
      },
      {
        "name": "number_of_paths",
        "type": "INTEGER",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "number of paths"
      },
      {
        "name": "time_bucket_scheme",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "time bucket scheme"
      },
      {
        "name": "random_seed",
        "type": "BIGINT",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "random seed"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_simulation_run_date",
      "idx_simulation_status"
    ],
    "constraints": [
      "number_of_paths > 0"
    ]
  },
  {
    "table": "simulation_path",
    "logicalEntity": "Simulation Path",
    "owner": "Simulation Service",
    "description": "Individual simulated path header and path-level metadata.",
    "fields": [
      {
        "name": "path_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "path id"
      },
      {
        "name": "simulation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "simulation_run.simulation_run_id",
        "description": "simulation run id"
      },
      {
        "name": "path_number",
        "type": "INTEGER",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "path number"
      },
      {
        "name": "path_weight",
        "type": "NUMERIC(18,12)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "path weight"
      },
      {
        "name": "scenario_family",
        "type": "VARCHAR(40)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "scenario family"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_path_run",
      "uk_path_run_number"
    ],
    "constraints": [
      "path_number >= 0",
      "path_weight > 0"
    ]
  },
  {
    "table": "exposure_profile_header",
    "logicalEntity": "Exposure Profile",
    "owner": "Exposure Service",
    "description": "Header for netting-set exposure profile generated by a calculation run.",
    "fields": [
      {
        "name": "profile_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "profile id"
      },
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "calculation_run.calculation_run_id",
        "description": "calculation run id"
      },
      {
        "name": "netting_set_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "netting_set.netting_set_id",
        "description": "netting set id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "simulation_run_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "simulation_run.simulation_run_id",
        "description": "simulation run id"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "profile_currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "profile currency"
      },
      {
        "name": "collateral_model",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "collateral model"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_exposure_header_netting_set",
      "idx_exposure_header_calc_run"
    ],
    "constraints": [
      "status IN ('CALCULATED','APPROVED','SUPERSEDED','FAILED')"
    ]
  },
  {
    "table": "exposure_profile_time_bucket",
    "logicalEntity": "Exposure Profile",
    "owner": "Exposure Service",
    "description": "Time-bucket level exposure measures generated by exposure calculation.",
    "fields": [
      {
        "name": "bucket_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "bucket id"
      },
      {
        "name": "profile_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "exposure_profile_header.profile_id",
        "description": "profile id"
      },
      {
        "name": "bucket_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "bucket date"
      },
      {
        "name": "tenor_label",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "tenor label"
      },
      {
        "name": "expected_exposure",
        "type": "NUMERIC(18,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "expected exposure"
      },
      {
        "name": "negative_expected_exposure",
        "type": "NUMERIC(18,6)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "negative expected exposure"
      },
      {
        "name": "pfe_95",
        "type": "NUMERIC(18,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "pfe 95"
      },
      {
        "name": "pfe_99",
        "type": "NUMERIC(18,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "pfe 99"
      },
      {
        "name": "discount_factor",
        "type": "NUMERIC(18,12)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "discount factor"
      },
      {
        "name": "discounted_expected_exposure",
        "type": "NUMERIC(18,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "discounted expected exposure"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_exposure_bucket_profile_id",
      "idx_exposure_bucket_date",
      "idx_exposure_bucket_profile_date"
    ],
    "constraints": [
      "expected_exposure >= 0",
      "pfe_95 >= expected_exposure",
      "pfe_99 >= pfe_95"
    ]
  },
  {
    "table": "cva_result_header",
    "logicalEntity": "CVA Result",
    "owner": "CVA Service",
    "description": "Header-level CVA result by counterparty, netting set, calculation run and model version.",
    "fields": [
      {
        "name": "cva_result_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "cva result id"
      },
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "calculation_run.calculation_run_id",
        "description": "calculation run id"
      },
      {
        "name": "profile_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "exposure_profile_header.profile_id",
        "description": "profile id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "netting_set_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "netting_set.netting_set_id",
        "description": "netting set id"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "cva_amount",
        "type": "NUMERIC(22,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "cva amount"
      },
      {
        "name": "model_version",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "model version"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_cva_result_counterparty",
      "idx_cva_result_run",
      "idx_cva_result_netting"
    ],
    "constraints": []
  },
  {
    "table": "cva_result_bucket",
    "logicalEntity": "CVA Result",
    "owner": "CVA Service",
    "description": "Bucket-level CVA contribution retaining exposure, credit and discounting inputs for explainability.",
    "fields": [
      {
        "name": "cva_bucket_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "cva bucket id"
      },
      {
        "name": "cva_result_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "cva_result_header.cva_result_id",
        "description": "cva result id"
      },
      {
        "name": "bucket_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "bucket date"
      },
      {
        "name": "tenor_label",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "tenor label"
      },
      {
        "name": "expected_exposure",
        "type": "NUMERIC(18,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "expected exposure"
      },
      {
        "name": "discount_factor",
        "type": "NUMERIC(18,12)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "discount factor"
      },
      {
        "name": "survival_probability",
        "type": "NUMERIC(18,12)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "survival probability"
      },
      {
        "name": "marginal_default_probability",
        "type": "NUMERIC(18,12)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "marginal default probability"
      },
      {
        "name": "lgd",
        "type": "NUMERIC(8,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "lgd"
      },
      {
        "name": "bucket_cva",
        "type": "NUMERIC(22,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "bucket cva"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_cva_bucket_result",
      "idx_cva_bucket_date"
    ],
    "constraints": [
      "survival_probability >= 0 AND survival_probability <= 1",
      "lgd >= 0 AND lgd <= 1"
    ]
  },
  {
    "table": "sensitivity_result",
    "logicalEntity": "Sensitivity",
    "owner": "Sensitivity Service",
    "description": "Risk factor sensitivity result for XVA movement, hedging and desk actioning.",
    "fields": [
      {
        "name": "sensitivity_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "sensitivity id"
      },
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "calculation_run.calculation_run_id",
        "description": "calculation run id"
      },
      {
        "name": "semantic_object_type",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "semantic object type"
      },
      {
        "name": "semantic_object_id",
        "type": "UUID",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "semantic object id"
      },
      {
        "name": "risk_factor",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "risk factor"
      },
      {
        "name": "shock_label",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "shock label"
      },
      {
        "name": "delta",
        "type": "NUMERIC(22,8)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "delta"
      },
      {
        "name": "gamma",
        "type": "NUMERIC(22,8)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "gamma"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_sensitivity_run",
      "idx_sensitivity_factor"
    ],
    "constraints": []
  },
  {
    "table": "hedge_recommendation",
    "logicalEntity": "Hedge Recommendation",
    "owner": "Hedge Advisory Service",
    "description": "Actionable recommendation with priority, rationale, expected impact and execution status.",
    "fields": [
      {
        "name": "recommendation_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "recommendation id"
      },
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "calculation_run.calculation_run_id",
        "description": "calculation run id"
      },
      {
        "name": "counterparty_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "counterparty.counterparty_id",
        "description": "counterparty id"
      },
      {
        "name": "netting_set_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "netting_set.netting_set_id",
        "description": "netting set id"
      },
      {
        "name": "priority",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "priority"
      },
      {
        "name": "action_type",
        "type": "VARCHAR(60)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "action type"
      },
      {
        "name": "expected_xva_reduction",
        "type": "NUMERIC(22,6)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "expected xva reduction"
      },
      {
        "name": "rationale_code",
        "type": "VARCHAR(60)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "rationale code"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_hedge_counterparty",
      "idx_hedge_status",
      "idx_hedge_priority"
    ],
    "constraints": [
      "priority IN ('LOW','MEDIUM','HIGH','CRITICAL')"
    ]
  },
  {
    "table": "reconciliation_break",
    "logicalEntity": "Reconciliation Break",
    "owner": "Reconciliation Service",
    "description": "Classified difference between M7 result and external Murex or golden-source result.",
    "fields": [
      {
        "name": "break_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "break id"
      },
      {
        "name": "reconciliation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "FK",
        "references": "reconciliation_run.reconciliation_run_id",
        "description": "reconciliation run id"
      },
      {
        "name": "external_result_id",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "external result id"
      },
      {
        "name": "internal_result_id",
        "type": "UUID",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "internal result id"
      },
      {
        "name": "break_type",
        "type": "VARCHAR(60)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "break type"
      },
      {
        "name": "break_amount",
        "type": "NUMERIC(22,6)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "break amount"
      },
      {
        "name": "currency",
        "type": "CHAR(3)",
        "nullable": false,
        "key": "FK",
        "references": "currency.currency_code",
        "description": "currency"
      },
      {
        "name": "severity",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "severity"
      },
      {
        "name": "classification_status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "classification status"
      },
      {
        "name": "assigned_owner",
        "type": "VARCHAR(80)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "assigned owner"
      },
      {
        "name": "created_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creation timestamp."
      },
      {
        "name": "created_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "Creating user, service or batch identity."
      },
      {
        "name": "updated_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "Last update timestamp."
      }
    ],
    "indexes": [
      "idx_break_run",
      "idx_break_severity",
      "idx_break_status"
    ],
    "constraints": []
  },
  {
    "table": "calculation_run",
    "logicalEntity": "Calculation Run",
    "owner": "Evidence Service",
    "description": "Immutable execution record for every calculation or control run.",
    "fields": [
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "calculation run id"
      },
      {
        "name": "run_type",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "run type"
      },
      {
        "name": "valuation_date",
        "type": "DATE",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "valuation date"
      },
      {
        "name": "triggered_by",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "triggered by"
      },
      {
        "name": "service_name",
        "type": "VARCHAR(80)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "service name"
      },
      {
        "name": "service_version",
        "type": "VARCHAR(40)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "service version"
      },
      {
        "name": "input_snapshot_hash",
        "type": "VARCHAR(128)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "input snapshot hash"
      },
      {
        "name": "output_snapshot_hash",
        "type": "VARCHAR(128)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "output snapshot hash"
      },
      {
        "name": "started_at",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "started at"
      },
      {
        "name": "completed_at",
        "type": "TIMESTAMPTZ",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "completed at"
      },
      {
        "name": "status",
        "type": "VARCHAR(20)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "status"
      }
    ],
    "indexes": [
      "idx_calc_run_type_date",
      "idx_calc_run_status"
    ],
    "constraints": [
      "status IN ('STARTED','COMPLETED','FAILED','SUPERSEDED')"
    ]
  },
  {
    "table": "evidence_event",
    "logicalEntity": "Evidence Record",
    "owner": "Evidence Service",
    "description": "Fine-grained runtime trace connecting user actions, APIs, services, data objects and semantic objects.",
    "fields": [
      {
        "name": "evidence_event_id",
        "type": "UUID",
        "nullable": false,
        "key": "PK",
        "references": null,
        "description": "evidence event id"
      },
      {
        "name": "calculation_run_id",
        "type": "UUID",
        "nullable": true,
        "key": "FK",
        "references": "calculation_run.calculation_run_id",
        "description": "calculation run id"
      },
      {
        "name": "event_timestamp",
        "type": "TIMESTAMPTZ",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "event timestamp"
      },
      {
        "name": "event_type",
        "type": "VARCHAR(60)",
        "nullable": false,
        "key": null,
        "references": null,
        "description": "event type"
      },
      {
        "name": "semantic_object",
        "type": "VARCHAR(80)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "semantic object"
      },
      {
        "name": "component_name",
        "type": "VARCHAR(120)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "component name"
      },
      {
        "name": "api_endpoint",
        "type": "VARCHAR(160)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "api endpoint"
      },
      {
        "name": "service_name",
        "type": "VARCHAR(80)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "service name"
      },
      {
        "name": "database_object",
        "type": "VARCHAR(120)",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "database object"
      },
      {
        "name": "evidence_payload",
        "type": "JSONB",
        "nullable": true,
        "key": null,
        "references": null,
        "description": "evidence payload"
      }
    ],
    "indexes": [
      "idx_evidence_run",
      "idx_evidence_semantic_object",
      "idx_evidence_timestamp"
    ],
    "constraints": []
  }
]

export const services = [
  {
    "name": "Trade Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Maintain canonical trade identity and economic terms",
      "Expose trade search and trade detail APIs",
      "Normalise source-system trade identifiers",
      "Publish trade lifecycle changes"
    ],
    "apis": [
      "GET /trades",
      "GET /trades/{tradeId}",
      "POST /trades/ingest",
      "GET /trades/{tradeId}/cashflows"
    ],
    "reads": [
      "trade_header",
      "trade_cashflow_schedule",
      "trade_lifecycle_event"
    ],
    "writes": [
      "trade_header",
      "trade_cashflow_schedule",
      "trade_lifecycle_event"
    ],
    "consumedBy": [
      "Exposure Overview Panel",
      "Reconciliation Service",
      "Simulation Service"
    ]
  },
  {
    "name": "Counterparty Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Maintain counterparty master and credit attributes",
      "Expose ratings and LGD assumptions",
      "Publish credit curve references"
    ],
    "apis": [
      "GET /counterparties",
      "GET /counterparties/{counterpartyId}",
      "GET /counterparties/{counterpartyId}/credit-curve"
    ],
    "reads": [
      "counterparty",
      "counterparty_rating_history",
      "counterparty_credit_curve"
    ],
    "writes": [
      "counterparty",
      "counterparty_rating_history"
    ],
    "consumedBy": [
      "Counterparty Detail Panel",
      "CVA Service",
      "Hedge Advisory Service"
    ]
  },
  {
    "name": "Legal Entity Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Maintain legal entity hierarchy",
      "Resolve LEI and booking entity relationships",
      "Support ownership and regulatory segmentation"
    ],
    "apis": [
      "GET /legal-entities",
      "GET /legal-entities/{legalEntityId}",
      "GET /legal-entities/{legalEntityId}/hierarchy"
    ],
    "reads": [
      "legal_entity",
      "legal_entity_identifier"
    ],
    "writes": [
      "legal_entity",
      "legal_entity_hierarchy"
    ],
    "consumedBy": [
      "Trade Service",
      "Counterparty Service",
      "CSA Service"
    ]
  },
  {
    "name": "Netting Set Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Own netting-set definitions",
      "Maintain trade-to-netting-set eligibility",
      "Expose aggregation boundaries for simulation and XVA"
    ],
    "apis": [
      "GET /netting-sets",
      "GET /netting-sets/{nettingSetId}",
      "GET /netting-sets/{nettingSetId}/trades"
    ],
    "reads": [
      "netting_set",
      "netting_set_trade_link",
      "csa_agreement"
    ],
    "writes": [
      "netting_set",
      "netting_set_trade_link"
    ],
    "consumedBy": [
      "Exposure Service",
      "CVA Service",
      "Desk Head Panel"
    ]
  },
  {
    "name": "CSA Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Own CSA terms and thresholds",
      "Expose collateral parameters to exposure engine",
      "Maintain threshold schedules and eligible collateral"
    ],
    "apis": [
      "GET /csas",
      "GET /csas/{csaId}",
      "GET /csas/{csaId}/terms"
    ],
    "reads": [
      "csa_agreement",
      "csa_collateral_terms",
      "csa_threshold_schedule"
    ],
    "writes": [
      "csa_agreement",
      "csa_collateral_terms"
    ],
    "consumedBy": [
      "Collateral Service",
      "Exposure Service",
      "FVA Service"
    ]
  },
  {
    "name": "Collateral Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Maintain collateral balances",
      "Apply eligibility and haircut rules",
      "Feed collateralised exposure calculation"
    ],
    "apis": [
      "GET /collateral/accounts",
      "GET /collateral/accounts/{accountId}",
      "POST /collateral/valuation/run"
    ],
    "reads": [
      "collateral_account",
      "collateral_balance",
      "csa_agreement"
    ],
    "writes": [
      "collateral_balance",
      "collateral_valuation_event"
    ],
    "consumedBy": [
      "Exposure Service",
      "FVA Service",
      "Desk Head Panel"
    ]
  },
  {
    "name": "Market Data Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Load market data observations",
      "Validate curves, FX rates and volatility surfaces",
      "Publish market-data snapshots for calculations"
    ],
    "apis": [
      "GET /market-data/snapshots/{valuationDate}",
      "GET /market-data/fx",
      "GET /market-data/curves",
      "POST /market-data/load"
    ],
    "reads": [
      "market_data_source",
      "market_curve_header",
      "market_curve_point",
      "fx_rate",
      "vol_surface_point"
    ],
    "writes": [
      "market_curve_header",
      "market_curve_point",
      "fx_rate",
      "vol_surface_header",
      "vol_surface_point"
    ],
    "consumedBy": [
      "Curve Service",
      "Simulation Service",
      "Exposure Service",
      "CVA Service"
    ]
  },
  {
    "name": "Curve Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Bootstrap and interpolate curves",
      "Generate discount and projection factors",
      "Version curve construction assumptions"
    ],
    "apis": [
      "POST /curves/bootstrap",
      "GET /curves/{curveId}",
      "GET /curves/{curveId}/points"
    ],
    "reads": [
      "market_curve_header",
      "market_curve_point",
      "market_data_source"
    ],
    "writes": [
      "market_curve_header",
      "market_curve_point"
    ],
    "consumedBy": [
      "Simulation Service",
      "CVA Service",
      "FVA Service"
    ]
  },
  {
    "name": "Simulation Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Create simulation runs",
      "Generate scenario paths and projected market states",
      "Persist path-level metadata for explainability"
    ],
    "apis": [
      "POST /simulations/run",
      "GET /simulations/{simulationRunId}",
      "GET /simulations/{simulationRunId}/paths"
    ],
    "reads": [
      "market_curve_header",
      "market_curve_point",
      "fx_rate",
      "vol_surface_point",
      "simulation_config"
    ],
    "writes": [
      "simulation_run",
      "simulation_path",
      "simulation_path_market_state"
    ],
    "consumedBy": [
      "Exposure Service",
      "Evidence Service",
      "Semantic Architecture Panel"
    ]
  },
  {
    "name": "Exposure Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Calculate EE, NEE and PFE by time bucket",
      "Apply collateral and netting rules",
      "Persist exposure profiles by run and netting set"
    ],
    "apis": [
      "POST /exposures/calculate",
      "GET /exposures/{profileId}",
      "GET /exposures/netting-set/{nettingSetId}"
    ],
    "reads": [
      "trade_header",
      "netting_set",
      "csa_agreement",
      "simulation_path",
      "collateral_account"
    ],
    "writes": [
      "exposure_profile_header",
      "exposure_profile_time_bucket",
      "exposure_scenario_path"
    ],
    "consumedBy": [
      "Exposure Overview Panel",
      "CVA Service",
      "Reconciliation Service"
    ]
  },
  {
    "name": "CVA Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Calculate CVA from exposure and credit curves",
      "Retain bucket-level CVA explainability",
      "Aggregate CVA by counterparty, netting set and portfolio"
    ],
    "apis": [
      "POST /xva/cva/calculate",
      "GET /xva/cva/summary",
      "GET /xva/cva/{counterpartyId}"
    ],
    "reads": [
      "exposure_profile_header",
      "exposure_profile_time_bucket",
      "counterparty_credit_curve",
      "market_curve_point"
    ],
    "writes": [
      "cva_result_header",
      "cva_result_bucket",
      "cva_result_driver"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Desk Head Panel",
      "Evidence Trace Panel"
    ]
  },
  {
    "name": "DVA Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Calculate debit valuation adjustment",
      "Consume negative exposure and own credit curve",
      "Publish DVA buckets and portfolio contribution"
    ],
    "apis": [
      "POST /xva/dva/calculate",
      "GET /xva/dva/summary",
      "GET /xva/dva/{nettingSetId}"
    ],
    "reads": [
      "exposure_profile_time_bucket",
      "own_credit_curve",
      "market_curve_point"
    ],
    "writes": [
      "dva_result_header",
      "dva_result_bucket"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Portfolio Summary Panel"
    ]
  },
  {
    "name": "FVA Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Calculate funding valuation adjustment",
      "Consume funding curve and collateral profile",
      "Explain funding cost by bucket"
    ],
    "apis": [
      "POST /xva/fva/calculate",
      "GET /xva/fva/summary",
      "GET /xva/fva/{nettingSetId}"
    ],
    "reads": [
      "exposure_profile_time_bucket",
      "funding_curve_point",
      "collateral_account"
    ],
    "writes": [
      "fva_result_header",
      "fva_result_bucket"
    ],
    "consumedBy": [
      "CVA Risk Panel",
      "Treasury View"
    ]
  },
  {
    "name": "Sensitivity Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Run risk-factor shocks",
      "Calculate delta and gamma against XVA results",
      "Persist explainable sensitivity surfaces"
    ],
    "apis": [
      "POST /sensitivities/run",
      "GET /sensitivities/{runId}",
      "GET /sensitivities/by-factor/{riskFactor}"
    ],
    "reads": [
      "cva_result_header",
      "market_curve_point",
      "counterparty_credit_curve",
      "shock_set"
    ],
    "writes": [
      "sensitivity_result",
      "sensitivity_factor"
    ],
    "consumedBy": [
      "Desk Head Panel",
      "Hedge Advisory Service",
      "Risk Limit Service"
    ]
  },
  {
    "name": "Hedge Advisory Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Evaluate hedge adequacy",
      "Rank recommended desk actions",
      "Attach action rationale and expected impact"
    ],
    "apis": [
      "GET /desk/actions",
      "POST /desk/actions/recommend",
      "PATCH /desk/actions/{actionId}"
    ],
    "reads": [
      "cva_result_header",
      "sensitivity_result",
      "desk_limit",
      "risk_appetite_rule"
    ],
    "writes": [
      "hedge_recommendation",
      "hedge_recommendation_rationale",
      "desk_action_queue"
    ],
    "consumedBy": [
      "Desk Head Panel",
      "Evidence Service"
    ]
  },
  {
    "name": "Reconciliation Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Load external Murex comparison results",
      "Match trades, netting sets and XVA outputs",
      "Classify and route reconciliation breaks"
    ],
    "apis": [
      "POST /reconciliation/murex/load",
      "GET /reconciliation/breaks",
      "GET /reconciliation/breaks/{breakId}"
    ],
    "reads": [
      "trade_header",
      "exposure_profile_header",
      "cva_result_header",
      "external_murex_result"
    ],
    "writes": [
      "reconciliation_run",
      "reconciliation_break",
      "reconciliation_break_classification"
    ],
    "consumedBy": [
      "Murex Reconciliation Panel",
      "Evidence Service"
    ]
  },
  {
    "name": "Evidence Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Capture calculation runs and runtime evidence",
      "Link user actions to APIs, services, tables and semantic objects",
      "Provide audit-grade traceability"
    ],
    "apis": [
      "GET /evidence/runs",
      "GET /evidence/runs/{runId}",
      "GET /evidence/semantic/{objectName}"
    ],
    "reads": [
      "calculation_run",
      "evidence_event",
      "semantic_object_lineage"
    ],
    "writes": [
      "calculation_run",
      "evidence_event",
      "evidence_artifact"
    ],
    "consumedBy": [
      "Semantic Architecture Panel",
      "Quality Assurance",
      "Security Posture"
    ]
  },
  {
    "name": "Semantic Metadata Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Target",
    "responsibilities": [
      "Own target-state semantic metadata",
      "Expose object-to-service-to-data mappings",
      "Support MissionAtlas-style architecture exploration"
    ],
    "apis": [
      "GET /semantic-model",
      "GET /semantic-model/objects",
      "GET /semantic-model/lineage/{objectName}"
    ],
    "reads": [
      "semantic_object",
      "semantic_relationship",
      "service_catalog",
      "api_contract_catalog"
    ],
    "writes": [
      "semantic_object",
      "semantic_relationship",
      "service_catalog"
    ],
    "consumedBy": [
      "Semantic Architecture Panel",
      "MissionAtlas"
    ]
  },
  {
    "name": "Screen Composition Service",
    "runtime": "Python 3.11+ / FastAPI / SQLAlchemy",
    "status": "Partial",
    "responsibilities": [
      "Compose screen-ready payloads",
      "Separate frontend panels from backend orchestration",
      "Hide calculation and data fragmentation from UI"
    ],
    "apis": [
      "GET /screens/exposure/summary",
      "GET /screens/cva-risk/summary",
      "GET /screens/desk-head/actions"
    ],
    "reads": [
      "trade_header",
      "exposure_profile_header",
      "cva_result_header",
      "hedge_recommendation"
    ],
    "writes": [],
    "consumedBy": [
      "Exposure Overview Panel",
      "CVA Risk Panel",
      "Desk Head Panel"
    ]
  }
]

export const stackGroups = [
  {
    "title": "Frontend",
    "items": [
      "React 18 target \u00b7 implemented as JSX components",
      "JavaScript / JSX \u00b7 current implementation language",
      "Tailwind CSS 3.x target \u00b7 utility-first UI styling",
      "Vite 5.x target \u00b7 local dev server and bundling",
      "Panel-level component architecture \u00b7 target refactor direction",
      "Static semantic metadata now \u00b7 API-backed metadata later"
    ]
  },
  {
    "title": "Backend",
    "items": [
      "Python 3.11+ target \u00b7 current backend language",
      "FastAPI 0.110+ target \u00b7 REST API layer",
      "Uvicorn ASGI runtime \u00b7 local execution target",
      "SQLAlchemy 2.x target \u00b7 ORM and database access",
      "Pydantic models \u00b7 request/response contracts",
      "Modular monolith now \u00b7 service boundaries defined for target state"
    ]
  },
  {
    "title": "Database",
    "items": [
      "PostgreSQL 15+ target \u00b7 relational persistence",
      "UUID primary keys \u00b7 stable object identity",
      "Foreign-key enforced referential model",
      "NUMERIC(22,6) / NUMERIC(18,6) for financial precision",
      "TIMESTAMPTZ audit fields for evidence and control",
      "JSONB reserved for evidence payloads and metadata extensions"
    ]
  },
  {
    "title": "Engineering",
    "items": [
      "VS Code / Cursor \u00b7 development environment",
      "GitHub \u00b7 source control and snapshotting",
      "Localhost deployment \u00b7 current demo mode",
      "Seeded demo data \u00b7 no mock UI-only data target",
      "API-first development loop",
      "Target CI/CD with lint, tests, guardrails and security checks"
    ]
  }
]

export const targetExtensions = [
  "Monte Carlo simulation engine",
  "Market data adapters",
  "Murex reconciliation adapter",
  "Evidence logging",
  "Security controls",
  "CI/CD pipeline"
]

