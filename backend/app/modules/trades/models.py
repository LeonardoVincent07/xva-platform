from sqlalchemy import Column, String, Float, Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Counterparty(Base):
    __tablename__ = "counterparties"

    counterparty_id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    lei = Column(String)

    netting_sets = relationship("NettingSet", back_populates="counterparty")


class NettingSet(Base):
    __tablename__ = "netting_sets"

    netting_set_id = Column(String, primary_key=True)
    counterparty_id = Column(String, ForeignKey("counterparties.counterparty_id"), nullable=False)
    base_currency = Column(String, nullable=False)

    counterparty = relationship("Counterparty", back_populates="netting_sets")
    csa_agreements = relationship("CsaAgreement", back_populates="netting_set")
    trades = relationship("IrsTrade", back_populates="netting_set")


class CsaAgreement(Base):
    __tablename__ = "csa_agreements"

    csa_id = Column(String, primary_key=True)
    netting_set_id = Column(String, ForeignKey("netting_sets.netting_set_id"), nullable=False)
    threshold_amount = Column(Float, nullable=False)
    minimum_transfer_amount = Column(Float, nullable=False)
    margin_frequency = Column(String, nullable=False)
    margin_lag_days = Column(Integer, nullable=False)
    collateral_currency = Column(String, nullable=False)

    netting_set = relationship("NettingSet", back_populates="csa_agreements")


class IrsTrade(Base):
    __tablename__ = "irs_trades"

    trade_id = Column(String, primary_key=True)
    external_trade_id = Column(String, nullable=False)

    netting_set_id = Column(String, ForeignKey("netting_sets.netting_set_id"), nullable=False)

    notional = Column(Float, nullable=False)
    currency = Column(String, nullable=False)

    trade_date = Column(Date, nullable=False)
    effective_date = Column(Date, nullable=False)
    maturity_date = Column(Date, nullable=False)

    fixed_rate = Column(Float, nullable=False)
    floating_index = Column(String, nullable=False)
    pay_receive_fixed = Column(String, nullable=False)

    netting_set = relationship("NettingSet", back_populates="trades")


class MarketDataSnapshot(Base):
    __tablename__ = "market_data_snapshots"

    market_data_snapshot_id = Column(String, primary_key=True)
    valuation_date = Column(Date, nullable=False)
    source_system = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    curves = relationship("Curve", back_populates="snapshot")


class Curve(Base):
    __tablename__ = "curves"

    curve_id = Column(String, primary_key=True)
    market_data_snapshot_id = Column(
        String,
        ForeignKey("market_data_snapshots.market_data_snapshot_id"),
        nullable=False
    )

    curve_type = Column(String, nullable=False)   # DISCOUNT, FORWARD, CREDIT
    curve_name = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    floating_index = Column(String)
    counterparty_id = Column(String, ForeignKey("counterparties.counterparty_id"))

    snapshot = relationship("MarketDataSnapshot", back_populates="curves")
    points = relationship("CurvePoint", back_populates="curve")


class CurvePoint(Base):
    __tablename__ = "curve_points"

    curve_point_id = Column(String, primary_key=True)
    curve_id = Column(String, ForeignKey("curves.curve_id"), nullable=False)

    tenor = Column(String, nullable=False)
    maturity_date = Column(Date, nullable=False)
    value = Column(Float, nullable=False)
    value_type = Column(String, nullable=False)

    curve = relationship("Curve", back_populates="points")


class RecoveryRate(Base):
    __tablename__ = "recovery_rates"

    recovery_rate_id = Column(String, primary_key=True)
    counterparty_id = Column(String, ForeignKey("counterparties.counterparty_id"), nullable=False)
    market_data_snapshot_id = Column(
        String,
        ForeignKey("market_data_snapshots.market_data_snapshot_id"),
        nullable=False
    )
    recovery_rate = Column(Float, nullable=False)


class CalculationRun(Base):
    __tablename__ = "calculation_runs"

    calculation_run_id = Column(String, primary_key=True)
    run_type = Column(String, nullable=False)  # CVA

    netting_set_id = Column(String, ForeignKey("netting_sets.netting_set_id"), nullable=False)
    market_data_snapshot_id = Column(
        String,
        ForeignKey("market_data_snapshots.market_data_snapshot_id"),
        nullable=False
    )
    csa_id = Column(String, ForeignKey("csa_agreements.csa_id"), nullable=False)

    valuation_date = Column(Date, nullable=False)
    status = Column(String, nullable=False)
    model_version = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    exposure_profiles = relationship("ExposureProfile", back_populates="calculation_run")
    cva_results = relationship("CvaResult", back_populates="calculation_run")


class ExposureProfile(Base):
    __tablename__ = "exposure_profiles"

    exposure_profile_id = Column(String, primary_key=True)
    calculation_run_id = Column(
        String,
        ForeignKey("calculation_runs.calculation_run_id"),
        nullable=False
    )

    time_bucket_date = Column(Date, nullable=False)
    expected_exposure = Column(Float, nullable=False)
    expected_positive_exposure = Column(Float, nullable=False)
    pfe = Column(Float)
    discount_factor = Column(Float)
    marginal_default_probability = Column(Float)

    calculation_run = relationship("CalculationRun", back_populates="exposure_profiles")


class CvaResult(Base):
    __tablename__ = "cva_results"

    cva_result_id = Column(String, primary_key=True)
    calculation_run_id = Column(
        String,
        ForeignKey("calculation_runs.calculation_run_id"),
        nullable=False
    )

    cva_amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    cs01 = Column(Float)

    calculation_run = relationship("CalculationRun", back_populates="cva_results")