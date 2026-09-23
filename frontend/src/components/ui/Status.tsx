"use client";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { Button } from "./button";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { ApiError } from "@/lib/api";

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n("workspace");
  return (
    <div className="status-message" role="status">
      <LoaderCircle size={22} className="spin" />
      <span>{label ?? t("loading")}</span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string | Error;
  onRetry?: () => void;
}) {
  const { t } = useI18n("workspace");
  const knownCodes = new Set(["NETWORK_ERROR", "TIMEOUT", "CONTRACT_MISMATCH", "HTTP_ERROR", "DATASET_NOT_FOUND", "ANALYSIS_NOT_FOUND", "GID_NOT_FOUND", "INVALID_INPUT", "ANALYSIS_BUSY", "PIPELINE_FAILED", "EXPORT_NOT_FOUND"]);
  const text = message instanceof ApiError
    ? t(knownCodes.has(message.code) ? `error.${message.code}` : "error.unknown", { status: message.status })
    : message instanceof Error ? t("error.unknown") : message;
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <p>{text}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}
