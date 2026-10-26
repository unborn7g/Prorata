"use client";

import React, { useEffect, useState } from "react";
import {
  CURRENCIES,
  CurrencyCode,
  PersonInput,
  SplitMethod,
  buildMessage,
  clampNonNegativeFloat,
  clampNonNegativeInt,
  formatMoney,
  settleUp,
  splitCost,
} from "@/lib/prorata";
import {
  SAMPLE_CURRENCY,
  SAMPLE_DEFAULT_METHOD,
  SAMPLE_PAYER_ID,
  SAMPLE_PERIOD_DAYS,
  SAMPLE_TOTAL,
  SAMPLE_UNITS_KWH,
  getSamplePeople,
} from "@/lib/sample";

type ThemeMode = "auto" | "light" | "dark";

const STORAGE_KEY = "prorata-saved-state-v1";

export default function ProrataPage() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("auto");

  const [totalStr, setTotalStr] = useState<string>(String(SAMPLE_TOTAL));
  const [currency, setCurrency] = useState<CurrencyCode>(SAMPLE_CURRENCY);
  const [unitsStr, setUnitsStr] = useState<string>(String(SAMPLE_UNITS_KWH));
  const [periodStr, setPeriodStr] = useState<string>(
    String(SAMPLE_PERIOD_DAYS)
  );
  const [payerId, setPayerId] = useState<string>(SAMPLE_PAYER_ID);
  const [method, setMethod] = useState<SplitMethod>(SAMPLE_DEFAULT_METHOD);
  const [people, setPeople] = useState<PersonInput[]>(() => getSamplePeople());

  const [hydrated, setHydrated] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copyFallback, setCopyFallback] = useState<boolean>(false);

  // Restore theme and saved inputs from localStorage inside try/catch
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem("prorata-theme");
      if (
        savedTheme === "auto" ||
        savedTheme === "light" ||
        savedTheme === "dark"
      ) {
        setThemeMode(savedTheme);
      }
    } catch {
      // ignore storage errors
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.totalStr === "string") setTotalStr(parsed.totalStr);
        if (parsed.currency && CURRENCIES[parsed.currency as CurrencyCode]) {
          setCurrency(parsed.currency as CurrencyCode);
        }
        if (typeof parsed.unitsStr === "string") setUnitsStr(parsed.unitsStr);
        if (typeof parsed.periodStr === "string")
          setPeriodStr(parsed.periodStr);
        if (typeof parsed.payerId === "string") setPayerId(parsed.payerId);
        if (
          parsed.method === "equal" ||
          parsed.method === "days" ||
          parsed.method === "days_weight"
        ) {
          setMethod(parsed.method);
        }
        if (Array.isArray(parsed.people) && parsed.people.length > 0) {
          setPeople(parsed.people);
        }
      }
    } catch {
      // ignore storage errors
    }

    setHydrated(true);
  }, []);

  // Apply theme mode & listen to system changes when Auto is active
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "light" || themeMode === "dark") {
      root.setAttribute("data-theme", themeMode);
    } else {
      root.removeAttribute("data-theme");
    }
  }, [themeMode]);

  // Persist inputs to localStorage after hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          totalStr,
          currency,
          unitsStr,
          periodStr,
          payerId,
          method,
          people,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [
    hydrated,
    totalStr,
    currency,
    unitsStr,
    periodStr,
    payerId,
    method,
    people,
  ]);

  function handleSelectTheme(next: ThemeMode) {
    setThemeMode(next);
    try {
      window.localStorage.setItem("prorata-theme", next);
    } catch {
      // ignore storage errors
    }
  }

  const totalNum = clampNonNegativeInt(totalStr);
  const unitsNum = clampNonNegativeFloat(unitsStr);
  const periodDays = Math.max(1, clampNonNegativeInt(periodStr, 366) || 30);

  const effectivePayerId = people.some((p) => p.id === payerId)
    ? payerId
    : people[0]?.id ?? "";

  const split = splitCost({
    total: totalNum,
    units: unitsNum,
    periodDays,
    people,
    method,
  });

  const settlement = settleUp(effectivePayerId, split.shares);
  const messageText = buildMessage({
    total: totalNum,
    currency,
    units: unitsNum,
    payerId: effectivePayerId,
    people,
    method,
    periodDays,
  });

  function handleLoadSample() {
    setTotalStr(String(SAMPLE_TOTAL));
    setCurrency(SAMPLE_CURRENCY);
    setUnitsStr(String(SAMPLE_UNITS_KWH));
    setPeriodStr(String(SAMPLE_PERIOD_DAYS));
    setPayerId(SAMPLE_PAYER_ID);
    setMethod(SAMPLE_DEFAULT_METHOD);
    setPeople(getSamplePeople());
    setCopied(false);
    setCopyFallback(false);
  }

  function handleResetBlank() {
    setTotalStr("0");
    setUnitsStr("0");
    setPeriodStr("30");
    setMethod("days");
    const fresh: PersonInput[] = [
      { id: "p-1", name: "Flatmate 1", days: 30, weight: 1.0 },
      { id: "p-2", name: "Flatmate 2", days: 30, weight: 1.0 },
    ];
    setPeople(fresh);
    setPayerId("p-1");
    setCopied(false);
    setCopyFallback(false);
  }

  function handlePersonChange(
    id: string,
    field: "name" | "days" | "weight",
    raw: string
  ) {
    setPeople((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (field === "name") {
          return { ...p, name: raw };
        }
        if (field === "days") {
          const d = clampNonNegativeInt(raw, periodDays);
          return { ...p, days: d };
        }
        const w = clampNonNegativeFloat(raw, 100);
        return { ...p, weight: w };
      })
    );
    setCopied(false);
  }

  function handleAddPerson() {
    const nextIdx = people.length + 1;
    const newId = `person-${Date.now()}-${nextIdx}`;
    setPeople((prev) => [
      ...prev,
      {
        id: newId,
        name: `Flatmate ${nextIdx}`,
        days: periodDays,
        weight: 1.0,
      },
    ]);
    setCopied(false);
  }

  function handleRemovePerson(id: string) {
    const next = people.filter((p) => p.id !== id);
    if (next.length === 0) return;
    setPeople(next);
    if (payerId === id) {
      setPayerId(next[0].id);
    }
    setCopied(false);
  }

  async function handleCopyMessage() {
    if (!messageText) return;
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setCopyFallback(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFallback(true);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Sticky Frosted Glass Header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--glass-header)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderBottom: "1px solid var(--rule)",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "11px",
                background: "var(--mint-soft)",
                border: "1px solid var(--rule-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 18px var(--mint-glow)",
              }}
            >
              <svg
                viewBox="0 0 32 32"
                width="20"
                height="20"
                aria-hidden="true"
              >
                <path
                  d="M18 5L8 18h7.5L13.5 27 24 14h-7.5L18 5z"
                  fill="var(--mint)"
                />
              </svg>
            </div>
            <span
              className="pr-display"
              style={{
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              Prorata
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 600,
                padding: "7px 14px",
                borderRadius: "999px",
                background: "var(--well)",
                border: "1px solid var(--rule)",
                color: "var(--muted)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "var(--mint)",
                }}
              />
              Not financial advice
            </span>

            {/* Auto / Light / Dark Theme Segmented Control */}
            <div
              role="group"
              aria-label="Appearance"
              data-testid="theme-toggle"
              className="pr-segmented"
            >
              {(["auto", "light", "dark"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectTheme(m)}
                  aria-pressed={themeMode === m}
                  className="pr-segment"
                >
                  {m === "auto" ? "Auto" : m === "light" ? "Light" : "Dark"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "28px 24px 72px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* 1. Headline Banner */}
        <section
          className="pr-card"
          style={{
            padding: "26px 30px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "16px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxWidth: "680px",
            }}
          >
            <h1
              className="pr-display"
              style={{
                margin: 0,
                fontSize: "clamp(32px, 4.5vw, 48px)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
              }}
            >
              Split the meter fairly.
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: "16.5px",
                color: "var(--muted)",
              }}
            >
              Enter what was paid on the shared prepaid meter and who was in the
              house. Prorata splits the cost by equal share, days present, or
              days times appliance weight, and guarantees the shares add up to
              the exact amount paid.
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <button
              type="button"
              className="pr-btn-ghost"
              data-testid="load-sample"
              onClick={handleLoadSample}
            >
              Load 4-flatmate sample ({formatMoney(SAMPLE_TOTAL, SAMPLE_CURRENCY)})
            </button>
            <button
              type="button"
              className="pr-btn-ghost"
              data-testid="clear-inputs"
              onClick={handleResetBlank}
            >
              Start fresh
            </button>
          </div>
        </section>

        {/* Top Split Grid: Left = Top-Up + Method + People | Right = Live Result + Who Owes Payer */}
        <section
          className="pr-top-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.08fr) minmax(0, 0.92fr)",
            gap: "22px",
            alignItems: "start",
          }}
        >
          {/* Left Column: 2. Top-up Card + 4. Method Switch + 3. People Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {/* 2. Top-Up Card */}
            <div
              data-testid="topup-card"
              className="pr-card"
              style={{
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div>
                <h2
                  className="pr-display"
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Meter top-up details
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "15px",
                    color: "var(--muted)",
                  }}
                >
                  Amount paid, currency, optional kWh units received, and who
                  topped up the meter.
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                  gap: "14px",
                }}
              >
                {/* Amount Paid */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    htmlFor="total-input"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Amount paid ({CURRENCIES[currency].symbol.trim()})
                  </label>
                  <input
                    id="total-input"
                    data-testid="total-input"
                    type="number"
                    min="0"
                    step="100"
                    value={totalStr}
                    onChange={(e) => {
                      setTotalStr(e.target.value);
                      setCopied(false);
                    }}
                    className="pr-input pr-num"
                    style={{ fontSize: "19px", fontWeight: 700 }}
                  />
                </div>

                {/* Currency */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    htmlFor="currency-select"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Currency
                  </label>
                  <select
                    id="currency-select"
                    data-testid="currency-select"
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value as CurrencyCode);
                      setCopied(false);
                    }}
                    className="pr-input"
                    style={{ fontWeight: 600 }}
                  >
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Units (kWh) */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    htmlFor="units-input"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Units received (kWh)
                  </label>
                  <input
                    id="units-input"
                    data-testid="units-input"
                    type="number"
                    min="0"
                    step="1"
                    value={unitsStr}
                    onChange={(e) => {
                      setUnitsStr(e.target.value);
                      setCopied(false);
                    }}
                    className="pr-input pr-num"
                    style={{ fontSize: "18px", fontWeight: 600 }}
                  />
                </div>

                {/* Period Days */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    htmlFor="period-input"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Period length (days)
                  </label>
                  <input
                    id="period-input"
                    data-testid="period-input"
                    type="number"
                    min="1"
                    max="366"
                    step="1"
                    value={periodStr}
                    onChange={(e) => {
                      setPeriodStr(e.target.value);
                      setCopied(false);
                    }}
                    className="pr-input pr-num"
                    style={{ fontSize: "18px", fontWeight: 600 }}
                  />
                </div>

                {/* Who Paid */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label
                    htmlFor="payer-select"
                    style={{ fontSize: "15px", fontWeight: 600 }}
                  >
                    Who paid the meter?
                  </label>
                  <select
                    id="payer-select"
                    data-testid="payer-select"
                    value={effectivePayerId}
                    onChange={(e) => {
                      setPayerId(e.target.value);
                      setCopied(false);
                    }}
                    className="pr-input"
                    style={{ fontWeight: 600 }}
                  >
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name || "Unnamed"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Method Switch */}
              <div
                style={{
                  paddingTop: "8px",
                  borderTop: "1px solid var(--rule)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <span style={{ fontSize: "15px", fontWeight: 600 }}>
                    Split method
                  </span>
                  <div
                    role="group"
                    aria-label="Split method"
                    className="pr-segmented"
                  >
                    <button
                      type="button"
                      data-testid="method-equal"
                      onClick={() => {
                        setMethod("equal");
                        setCopied(false);
                      }}
                      aria-pressed={method === "equal"}
                      className="pr-segment"
                    >
                      Equal split
                    </button>
                    <button
                      type="button"
                      data-testid="method-days"
                      onClick={() => {
                        setMethod("days");
                        setCopied(false);
                      }}
                      aria-pressed={method === "days"}
                      className="pr-segment"
                    >
                      By days present
                    </button>
                    <button
                      type="button"
                      data-testid="method-days-weight"
                      onClick={() => {
                        setMethod("days_weight");
                        setCopied(false);
                      }}
                      aria-pressed={method === "days_weight"}
                      className="pr-segment"
                    >
                      By days &amp; weight
                    </button>
                  </div>
                </div>

                <div
                  data-testid="method-explanation"
                  style={{
                    fontSize: "15px",
                    color: "var(--mint-text)",
                    background: "var(--mint-soft)",
                    border: "1px solid var(--rule)",
                    borderRadius: "12px",
                    padding: "10px 14px",
                    fontWeight: 500,
                  }}
                >
                  {split.explanation}
                </div>
              </div>
            </div>

            {/* 3. People Card */}
            <div
              data-testid="people-card"
              className="pr-card"
              style={{
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <h2
                    className="pr-display"
                    style={{
                      margin: 0,
                      fontSize: "22px",
                      fontWeight: 700,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    People in the house ({people.length})
                  </h2>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "15px",
                      color: "var(--muted)",
                    }}
                  >
                    Set how many days each person was home (out of {periodDays}{" "}
                    days) and their appliance load weight.
                  </p>
                </div>

                <button
                  type="button"
                  className="pr-btn-ghost"
                  data-testid="add-person"
                  onClick={handleAddPerson}
                >
                  + Add person
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {people.map((person, idx) => {
                  const n = idx + 1;
                  const isPayer = person.id === effectivePayerId;
                  return (
                    <div
                      key={person.id}
                      data-testid={`person-row-${n}`}
                      className="pr-person-row"
                      style={{
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: "var(--well)",
                        border: isPayer
                          ? "1px solid var(--rule-strong)"
                          : "1px solid var(--rule)",
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(130px, 1.2fr) minmax(130px, 1fr) minmax(150px, 1.1fr) auto",
                        gap: "12px",
                        alignItems: "end",
                      }}
                    >
                      {/* Name */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <label
                          htmlFor={`person-name-${n}`}
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>Name</span>
                          {isPayer && (
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 700,
                                padding: "1px 8px",
                                borderRadius: "999px",
                                background: "var(--mint-soft)",
                                color: "var(--mint-text)",
                              }}
                            >
                              Paid top-up
                            </span>
                          )}
                        </label>
                        <input
                          id={`person-name-${n}`}
                          data-testid={`person-name-${n}`}
                          type="text"
                          value={person.name}
                          onChange={(e) =>
                            handlePersonChange(
                              person.id,
                              "name",
                              e.target.value
                            )
                          }
                          className="pr-input"
                          style={{ fontWeight: 600 }}
                        />
                      </div>

                      {/* Days Present */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <label
                          htmlFor={`person-days-${n}`}
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--muted)",
                          }}
                        >
                          Days present (/{periodDays})
                        </label>
                        <input
                          id={`person-days-${n}`}
                          data-testid={`person-days-${n}`}
                          type="number"
                          min="0"
                          max={periodDays}
                          step="1"
                          value={String(person.days)}
                          onChange={(e) =>
                            handlePersonChange(
                              person.id,
                              "days",
                              e.target.value
                            )
                          }
                          className="pr-input pr-num"
                          style={{ fontWeight: 700 }}
                        />
                      </div>

                      {/* Weight */}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <label
                          htmlFor={`person-weight-${n}`}
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--muted)",
                          }}
                        >
                          Weight (1.0 normal, 1.5 AC)
                        </label>
                        <input
                          id={`person-weight-${n}`}
                          data-testid={`person-weight-${n}`}
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          disabled={method !== "days_weight"}
                          title={
                            method === "days_weight"
                              ? "Appliance load weight"
                              : "Switch to By days & weight to use this"
                          }
                          value={String(person.weight ?? 1)}
                          onChange={(e) =>
                            handlePersonChange(
                              person.id,
                              "weight",
                              e.target.value
                            )
                          }
                          className="pr-input pr-num"
                          style={{
                            fontWeight: 700,
                            opacity: method === "days_weight" ? 1 : 0.5,
                          }}
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        data-testid={`person-remove-${n}`}
                        onClick={() => handleRemovePerson(person.id)}
                        disabled={people.length <= 1}
                        aria-label={`Remove ${person.name}`}
                        className="pr-btn-ghost"
                        style={{
                          height: "46px",
                          padding: "0 14px",
                          opacity: people.length <= 1 ? 0.45 : 1,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: 5. Result Card + Settlement + 6. Group-Chat Message Card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "22px",
            }}
          >
            {/* 5. Result Card */}
            <div
              data-testid="result-card"
              className="pr-card-strong"
              style={{
                padding: "26px",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--muted)",
                    }}
                  >
                    Total meter top-up
                  </div>
                  <div
                    data-testid="result-total"
                    className="pr-num"
                    style={{
                      fontSize: "clamp(48px, 6vw, 72px)",
                      fontWeight: 800,
                      lineHeight: 0.98,
                      letterSpacing: "-0.04em",
                      color: "var(--mint)",
                      marginTop: "6px",
                    }}
                  >
                    {formatMoney(split.total, currency)}
                  </div>
                  {split.units > 0 && (
                    <div
                      className="pr-mono"
                      style={{
                        fontSize: "15px",
                        color: "var(--muted)",
                        marginTop: "6px",
                      }}
                    >
                      {split.units.toLocaleString("en-US")} kWh total units
                    </div>
                  )}
                </div>

                {/* Exactness Verification Pill */}
                <div
                  data-testid="exact-sum-check"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    background: split.error
                      ? "var(--amber-soft)"
                      : "var(--mint-soft)",
                    border: split.error
                      ? "1px solid var(--amber-border)"
                      : "1px solid var(--rule-strong)",
                    color: split.error
                      ? "var(--amber-text)"
                      : "var(--mint-text)",
                    fontSize: "14px",
                    fontWeight: 700,
                  }}
                >
                  <svg
                    viewBox="0 0 16 16"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 8.5l3.2 3.2L13 4.8" />
                  </svg>
                  <span>
                    Shares add up to {formatMoney(split.sumOfShares, currency)}
                  </span>
                </div>
              </div>

              {split.error && (
                <div
                  role="alert"
                  style={{
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: "var(--amber-soft)",
                    border: "1px solid var(--amber-border)",
                    color: "var(--amber-text)",
                    fontSize: "15px",
                    fontWeight: 600,
                  }}
                >
                  {split.error}
                </div>
              )}

              {/* Per-Person Shares with Visual Bars */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {split.shares.map((s, idx) => {
                  const n = idx + 1;
                  const isPayer = s.id === settlement.payerId;
                  return (
                    <div
                      key={s.id}
                      data-testid={`share-row-${n}`}
                      style={{
                        padding: "14px 16px",
                        borderRadius: "16px",
                        background: "var(--well)",
                        border: "1px solid var(--rule)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          <span
                            className="pr-display"
                            style={{ fontSize: "19px", fontWeight: 700 }}
                          >
                            {s.name}
                          </span>
                          <span
                            style={{
                              fontSize: "14px",
                              color: "var(--muted)",
                            }}
                          >
                            {method === "equal"
                              ? `Equal share (${s.percentage}%)`
                              : method === "days"
                                ? `${s.days} of ${periodDays} days (${s.percentage}%)`
                                : `${s.days}d × ${s.weight}x = ${s.effectiveWeight} weighted days (${s.percentage}%)`}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: "10px",
                          }}
                        >
                          {split.units > 0 && (
                            <span
                              className="pr-mono"
                              style={{
                                fontSize: "14px",
                                color: "var(--muted)",
                              }}
                            >
                              {s.unitsShare} kWh
                            </span>
                          )}
                          <span
                            className="pr-num"
                            style={{
                              fontSize: "22px",
                              fontWeight: 800,
                              color: isPayer
                                ? "var(--mint-text)"
                                : "var(--ink)",
                            }}
                          >
                            {formatMoney(s.share, currency)}
                          </span>
                        </div>
                      </div>

                      {/* Proportional Visual Bar */}
                      <div
                        style={{
                          height: "10px",
                          width: "100%",
                          borderRadius: "999px",
                          background: "var(--panel-solid)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          className="pr-bar-fill"
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, s.percentage))}%`,
                            borderRadius: "999px",
                            background: isPayer
                              ? "var(--mint)"
                              : "var(--amber)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Who Owes the Payer Section */}
              <div
                data-testid="settlement-card"
                style={{
                  padding: "16px 18px",
                  borderRadius: "16px",
                  background: "var(--well)",
                  border: "1px solid var(--rule-strong)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <h3
                    className="pr-display"
                    style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}
                  >
                    Who owes {settlement.payerName} (paid top-up)
                  </h3>
                  <span
                    className="pr-mono"
                    style={{ fontSize: "14px", color: "var(--muted)" }}
                  >
                    {settlement.payerName}&apos;s own share:{" "}
                    {formatMoney(settlement.payerOwnShare, currency)}
                  </span>
                </div>

                {settlement.debts.length === 0 ? (
                  <div style={{ fontSize: "15px", color: "var(--muted)" }}>
                    No other flatmates owe {settlement.payerName}.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {settlement.debts.map((d) => (
                      <div
                        key={d.fromId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background: "var(--panel-solid)",
                          border: "1px solid var(--rule)",
                          fontSize: "15.5px",
                        }}
                      >
                        <span>
                          <strong>{d.fromName}</strong> owes{" "}
                          <strong>{d.toName}</strong>
                        </span>
                        <span
                          className="pr-num"
                          style={{
                            fontWeight: 800,
                            fontSize: "18px",
                            color: "var(--mint-text)",
                          }}
                        >
                          {formatMoney(d.amount, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 6. Group-Chat Message Card */}
            <div
              data-testid="message-card"
              className="pr-card"
              style={{
                padding: "24px 26px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div>
                  <h2
                    className="pr-display"
                    style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}
                  >
                    Group-chat message
                  </h2>
                  <p
                    style={{
                      margin: "3px 0 0",
                      fontSize: "14.5px",
                      color: "var(--muted)",
                    }}
                  >
                    {copyFallback
                      ? "Select the text below and press Ctrl+C / Cmd+C."
                      : copied
                        ? "Copied to clipboard!"
                        : "Ready to paste into WhatsApp, Telegram, or SMS."}
                  </p>
                </div>

                <button
                  type="button"
                  className="pr-btn-mint"
                  data-testid="copy-message"
                  onClick={handleCopyMessage}
                >
                  <span>{copied ? "Copied" : "Copy message"}</span>
                </button>
              </div>

              <div
                data-testid="message-text"
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: "15.5px",
                  lineHeight: 1.6,
                  padding: "16px 18px",
                  borderRadius: "14px",
                  background: "var(--well)",
                  border: "1px solid var(--rule)",
                  borderLeft: "4px solid var(--mint)",
                  color: "var(--ink)",
                }}
              >
                {messageText}
              </div>
            </div>
          </div>
        </section>

        {/* 7. Footer */}
        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: "10px 24px",
            paddingTop: "8px",
            fontSize: "14px",
            color: "var(--muted)",
          }}
        >
          <span>
            Not financial advice. Prorata does not connect to any meter or
            payment service and does not look up regulator tariff bands.
          </span>
          <span>
            How it works: integer largest-remainder arithmetic in plain
            TypeScript so every share adds up to the exact amount paid.
          </span>
        </footer>
      </main>
    </div>
  );
}
