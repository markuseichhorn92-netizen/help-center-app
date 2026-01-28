import { createClient } from '@vercel/kv';
import { FitInnConfig, ImageInfo, DEFAULT_CONFIG, KV_KEYS } from './config';

// Separate KV-Instanz für das Dashboard (nutzt DASHBOARD_KV_* Variablen)
const dashboardKv = createClient({
  url: process.env.DASHBOARD_KV_REST_API_URL!,
  token: process.env.DASHBOARD_KV_REST_API_TOKEN!,
});

export async function getConfig(): Promise<FitInnConfig> {
  try {
    const config = await dashboardKv.get<FitInnConfig>(KV_KEYS.CONFIG);
    if (!config) {
      return { ...DEFAULT_CONFIG };
    }
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error('Error getting config from KV:', error);
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(config: Partial<FitInnConfig>): Promise<void> {
  try {
    const existingConfig = await getConfig();
    const updatedConfig: FitInnConfig = {
      ...existingConfig,
      ...config,
      lastModified: new Date().toISOString(),
    };
    await dashboardKv.set(KV_KEYS.CONFIG, updatedConfig);
  } catch (error) {
    console.error('Error saving config to KV:', error);
    throw error;
  }
}

export async function getPasswordHash(): Promise<string | null> {
  try {
    return await dashboardKv.get<string>(KV_KEYS.PASSWORD);
  } catch (error) {
    console.error('Error getting password from KV:', error);
    return null;
  }
}

export async function savePasswordHash(hash: string): Promise<void> {
  try {
    await dashboardKv.set(KV_KEYS.PASSWORD, hash);
  } catch (error) {
    console.error('Error saving password to KV:', error);
    throw error;
  }
}

export async function isSetupComplete(): Promise<boolean> {
  try {
    const value = await dashboardKv.get<string>(KV_KEYS.SETUP_COMPLETE);
    return value === 'true';
  } catch (error) {
    console.error('Error checking setup status:', error);
    return false;
  }
}

export async function setSetupComplete(): Promise<void> {
  try {
    await dashboardKv.set(KV_KEYS.SETUP_COMPLETE, 'true');
  } catch (error) {
    console.error('Error setting setup complete:', error);
    throw error;
  }
}

export async function getImages(): Promise<ImageInfo[]> {
  try {
    const images = await dashboardKv.get<ImageInfo[]>(KV_KEYS.IMAGES);
    return images || [];
  } catch (error) {
    console.error('Error getting images from KV:', error);
    return [];
  }
}

export async function saveImages(images: ImageInfo[]): Promise<void> {
  try {
    await dashboardKv.set(KV_KEYS.IMAGES, images);
    await saveConfig({});
  } catch (error) {
    console.error('Error saving images to KV:', error);
    throw error;
  }
}

export async function addImage(image: ImageInfo): Promise<void> {
  const images = await getImages();
  images.push(image);
  await saveImages(images);
}

export async function removeImage(name: string): Promise<ImageInfo | null> {
  const images = await getImages();
  const index = images.findIndex(img => img.name === name);
  if (index === -1) {
    return null;
  }
  const [removed] = images.splice(index, 1);
  await saveImages(images);
  return removed;
}

export async function updateImageOrder(orders: { name: string; order: number }[]): Promise<void> {
  const images = await getImages();
  for (const { name, order } of orders) {
    const image = images.find(img => img.name === name);
    if (image) {
      image.order = order;
    }
  }
  await saveImages(images);
}
