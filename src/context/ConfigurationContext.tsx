'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ProjectType, TemplateKind, TemplateRow, TransferConfigurations, TransferRole } from '@/types/config';
import { MOCK_CONFIGURATIONS } from '@/mock/configuration';
import { importConfigurationTemplate, removeConfigurationRole, saveConfigurationRole } from '@/lib/configuration';

interface ConfigurationValue {
  readonly configurations: TransferConfigurations;
  readonly saveRole: (projectType: ProjectType, role: TransferRole) => void;
  readonly removeRole: (projectType: ProjectType, roleId: string) => void;
  readonly importTemplate: (projectType: ProjectType, kind: TemplateKind, rows: ReadonlyArray<TemplateRow>) => void;
}
const ConfigurationContext = createContext<ConfigurationValue | null>(null);

export function ConfigurationProvider({ children }: { children: React.ReactNode }) {
  const [configurations, setConfigurations] = useState<TransferConfigurations>(MOCK_CONFIGURATIONS);
  const current = useRef(configurations);
  const update = useCallback((next: TransferConfigurations) => { current.current = next; setConfigurations(next); }, []);
  const saveRole = useCallback((projectType: ProjectType, role: TransferRole) => update(saveConfigurationRole(current.current, projectType, role)), [update]);
  const removeRole = useCallback((projectType: ProjectType, roleId: string) => update(removeConfigurationRole(current.current, projectType, roleId)), [update]);
  const importTemplate = useCallback((projectType: ProjectType, kind: TemplateKind, rows: ReadonlyArray<TemplateRow>) => update(importConfigurationTemplate(current.current, projectType, kind, rows)), [update]);
  const value = useMemo(() => ({ configurations, saveRole, removeRole, importTemplate }), [configurations, saveRole, removeRole, importTemplate]);
  return <ConfigurationContext.Provider value={value}>{children}</ConfigurationContext.Provider>;
}

export function useConfiguration() {
  const value = useContext(ConfigurationContext);
  if (!value) throw new Error('useConfiguration 必须在 ConfigurationProvider 内调用');
  return value;
}
