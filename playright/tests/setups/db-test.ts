import { test as base } from '../../fixtures';

export type TestOptions = {
  serviceName: string;
};

export const test = base.extend<TestOptions>({
  serviceName: ['', { option: true }],
});
