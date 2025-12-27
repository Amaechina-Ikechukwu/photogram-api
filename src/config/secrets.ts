import { SecretManagerServiceClient } from '@google-cloud/secret-manager';


const secretClient = new SecretManagerServiceClient();

export async function getSecret(secretName: string): Promise<string> {
  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
    }

    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await secretClient.accessSecretVersion({ name });
    
    const payload = version.payload?.data?.toString();
    
    if (!payload) {
      throw new Error(`Secret ${secretName} is empty`);
    }
    
    return payload;
  } catch (error) {
    console.error(`Error accessing secret ${secretName}:`, error);
    throw error;
  }
}

export async function loadSecretsToEnv(secretNames: string[]): Promise<void> {
  try {
    for (const secretName of secretNames) {
      const secretValue = await getSecret(secretName);
      process.env[secretName] = secretValue;
    }
  } catch (error) {
    console.error('Error loading secrets:', error);
    throw error;
  }
}
