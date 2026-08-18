/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the [Backend API Integration](https://docs.infinite.red/ignite-cli/boilerplate/app/services/#backend-api-integration)
 * documentation for more details.
 */
import { ApisauceInstance, create } from 'apisauce'
import Config from '../../config'
import type { ApiConfig } from './api.types'

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: 10000,
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: 'application/json',
      },
    })
  }

  async createUser(email: string, password: string, fullName: string) {
    const response = await this.apisauce.post('/users', {
      email,
      password,
      fullName,
    })
    if (!response.ok) {
      throw new Error(response.problem)
    }
    return response.data
  }

  async loginUser(email: string, password: string) {
    const response = await this.apisauce.post('/login', { email, password })
    if (!response.ok) {
      throw new Error(response.problem)
    }
    return response.data
  }
}

// Singleton instance of the API for convenience
export const api = new Api()
