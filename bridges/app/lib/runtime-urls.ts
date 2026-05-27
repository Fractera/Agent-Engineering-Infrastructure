"use client";

import { useState, useEffect } from "react";

type RuntimeUrls = {
  authUrl: string;
  appUrl: string;
  mediaUrl: string;
  adminUrl: string;
  bridgeUrl: string;
  ptyUrl: string;
  claudeUrl: string;
  codexUrl: string;
  geminiUrl: string;
  qwenUrl: string;
  kimiUrl: string;
  hermesUrl: string;
  brainUrl: string;
  hermesChatUrl: string;
};

const DEFAULTS: RuntimeUrls = {
  authUrl: "http://localhost:3001",
  appUrl: "http://localhost:3000",
  mediaUrl: "http://localhost:3300",
  adminUrl: "http://localhost:3002",
  bridgeUrl: "ws://localhost:3201/bridge/",
  ptyUrl: "ws://localhost:3201/bridge/",
  claudeUrl: "ws://localhost:3200/",
  codexUrl: "ws://localhost:3202/",
  geminiUrl: "ws://localhost:3203/",
  qwenUrl: "ws://localhost:3204/",
  kimiUrl: "ws://localhost:3205/",
  hermesUrl: "http://localhost:9119",
  brainUrl: "http://localhost:9621",
  hermesChatUrl: "http://localhost:9120",
};

function compute(): RuntimeUrls {
  if (typeof window === "undefined") return DEFAULTS;
  const { protocol, hostname } = window.location;
  const ws = protocol === "https:" ? "wss:" : "ws:";
  return {
    authUrl: `${protocol}//${hostname}:3001`,
    appUrl: `${protocol}//${hostname}:3000`,
    mediaUrl: `${protocol}//${hostname}:3300`,
    adminUrl: `${protocol}//${hostname}:3002`,
    bridgeUrl: `${ws}//${hostname}:3201/bridge/`,
    ptyUrl: `${ws}//${hostname}:3201/bridge/`,
    claudeUrl: `${ws}//${hostname}:3200/`,
    codexUrl: `${ws}//${hostname}:3202/`,
    geminiUrl: `${ws}//${hostname}:3203/`,
    qwenUrl: `${ws}//${hostname}:3204/`,
    kimiUrl: `${ws}//${hostname}:3205/`,
    hermesUrl: `${protocol}//${hostname}:9119`,
    brainUrl: `${protocol}//${hostname}:9621`,
    hermesChatUrl: `${protocol}//${hostname}:9120`,
  };
}

export function useRuntimeUrls(): RuntimeUrls {
  const [urls, setUrls] = useState<RuntimeUrls>(DEFAULTS);
  useEffect(() => { setUrls(compute()); }, []);
  return urls;
}

export function getRuntimeUrls(): RuntimeUrls {
  return compute();
}
