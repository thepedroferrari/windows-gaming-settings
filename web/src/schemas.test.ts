import { assertEquals } from 'https://deno.land/std@0.220.0/assert/mod.ts'
import { describe, it } from 'https://deno.land/std@0.220.0/testing/bdd.ts'
import {
  formatZodErrors,
  isParseSuccess,
  safeParseCatalog,
  safeParseProfile,
  type ValidatedProfile,
  validateCatalog,
  validateProfile,
} from './schemas.ts'

describe('Schema Validation', () => {
  describe('SoftwareCatalogSchema', () => {
    it('should validate a correct catalog', () => {
      const validCatalog = {
        discord: {
          id: 'Discord.Discord',
          name: 'Discord',
          category: 'gaming',
          desc: 'Voice chat',
        },
        steam: {
          id: 'Valve.Steam',
          name: 'Steam',
          category: 'launcher',
        },
      }

      const result = safeParseCatalog(validCatalog)
      assertEquals(isParseSuccess(result), true)
      if (isParseSuccess(result)) {
        assertEquals(result.data.discord.name, 'Discord')
      }
    })

    it('should accept all valid categories', () => {
      const categories = [
        'launcher',
        'gaming',
        'streaming',
        'monitoring',
        'browser',
        'media',
        'utility',
        'rgb',
        'dev',
        'runtime',
        'benchmark',
      ]

      for (const category of categories) {
        const catalog = {
          test: {
            id: 'Test.App',
            name: 'Test',
            category,
          },
        }
        const result = safeParseCatalog(catalog)
        assertEquals(isParseSuccess(result), true, `Category "${category}" should be valid`)
      }
    })

    it('should reject invalid category', () => {
      const invalidCatalog = {
        test: {
          id: 'Test.App',
          name: 'Test',
          category: 'invalid-category',
        },
      }

      const result = safeParseCatalog(invalidCatalog)
      assertEquals(isParseSuccess(result), false)
    })

    it('should reject missing required fields', () => {
      const missingId = {
        test: {
          name: 'Test',
          category: 'gaming',
        },
      }
      assertEquals(isParseSuccess(safeParseCatalog(missingId)), false)

      const missingName = {
        test: {
          id: 'Test.App',
          category: 'gaming',
        },
      }
      assertEquals(isParseSuccess(safeParseCatalog(missingName)), false)

      const missingCategory = {
        test: {
          id: 'Test.App',
          name: 'Test',
        },
      }
      assertEquals(isParseSuccess(safeParseCatalog(missingCategory)), false)
    })

    it('should accept optional fields', () => {
      const withOptionals = {
        test: {
          id: 'Test.App',
          name: 'Test',
          category: 'utility',
          icon: 'test-icon',
          emoji: '🧪',
          desc: 'A test application',
          selected: true,
        },
      }

      const result = safeParseCatalog(withOptionals)
      assertEquals(isParseSuccess(result), true)
      if (isParseSuccess(result)) {
        assertEquals(result.data.test.icon, 'test-icon')
        assertEquals(result.data.test.emoji, '🧪')
        assertEquals(result.data.test.selected, true)
      }
    })

    it('should reject empty id or name', () => {
      const emptyId = {
        test: {
          id: '',
          name: 'Test',
          category: 'gaming',
        },
      }
      assertEquals(isParseSuccess(safeParseCatalog(emptyId)), false)

      const emptyName = {
        test: {
          id: 'Test.App',
          name: '',
          category: 'gaming',
        },
      }
      assertEquals(isParseSuccess(safeParseCatalog(emptyName)), false)
    })
  })

  describe('SavedProfileSchema', () => {
    const validProfile = {
      version: '1.0',
      created: '2024-01-01T00:00:00.000Z',
      hardware: {
        cpu: 'amd_x3d',
        gpu: 'nvidia',
        peripherals: ['logitech', 'razer'],
      },
      optimizations: ['pagefile', 'fastboot', 'timer'],
      software: ['discord', 'steam'],
    }

    it('should validate a correct profile', () => {
      const result = safeParseProfile(validProfile)
      assertEquals(isParseSuccess(result), true)
      if (isParseSuccess(result)) {
        const profile: ValidatedProfile = result.data
        assertEquals(profile.version, '1.0')
        assertEquals(profile.hardware.cpu, 'amd_x3d')
      }
    })

    it('should accept all valid CPU types', () => {
      const cpuTypes = ['amd_x3d', 'amd', 'intel']
      for (const cpu of cpuTypes) {
        const profile = {
          ...validProfile,
          hardware: { ...validProfile.hardware, cpu },
        }
        const result = safeParseProfile(profile)
        assertEquals(isParseSuccess(result), true, `CPU type "${cpu}" should be valid`)
      }
    })

    it('should accept all valid GPU types', () => {
      const gpuTypes = ['nvidia', 'amd', 'intel']
      for (const gpu of gpuTypes) {
        const profile = {
          ...validProfile,
          hardware: { ...validProfile.hardware, gpu },
        }
        const result = safeParseProfile(profile)
        assertEquals(isParseSuccess(result), true, `GPU type "${gpu}" should be valid`)
      }
    })

    it('should accept all valid peripheral types', () => {
      const peripherals = ['logitech', 'razer', 'corsair', 'steelseries']
      const profile = {
        ...validProfile,
        hardware: { ...validProfile.hardware, peripherals },
      }
      const result = safeParseProfile(profile)
      assertEquals(isParseSuccess(result), true)
    })

    it('should reject invalid CPU type', () => {
      const profile = {
        ...validProfile,
        hardware: { ...validProfile.hardware, cpu: 'invalid' },
      }
      const result = safeParseProfile(profile)
      assertEquals(isParseSuccess(result), false)
    })

    it('should reject invalid GPU type', () => {
      const profile = {
        ...validProfile,
        hardware: { ...validProfile.hardware, gpu: 'invalid' },
      }
      const result = safeParseProfile(profile)
      assertEquals(isParseSuccess(result), false)
    })

    it('should reject invalid peripheral type', () => {
      const profile = {
        ...validProfile,
        hardware: { ...validProfile.hardware, peripherals: ['invalid'] },
      }
      const result = safeParseProfile(profile)
      assertEquals(isParseSuccess(result), false)
    })

    it('should reject missing required fields', () => {
      const missingVersion: Record<string, unknown> = { ...validProfile }
      delete missingVersion.version
      assertEquals(isParseSuccess(safeParseProfile(missingVersion)), false)

      const missingHardware: Record<string, unknown> = { ...validProfile }
      delete missingHardware.hardware
      assertEquals(isParseSuccess(safeParseProfile(missingHardware)), false)
    })
  })

  describe('validateCatalog (throws)', () => {
    it('should return valid catalog', () => {
      const validCatalog = {
        test: {
          id: 'Test.App',
          name: 'Test',
          category: 'utility',
        },
      }

      const result = validateCatalog(validCatalog)
      assertEquals(result.test.name, 'Test')
    })

    it('should throw on invalid catalog', () => {
      const invalidCatalog = { test: { invalid: true } }
      let threw = false
      try {
        validateCatalog(invalidCatalog)
      } catch {
        threw = true
      }
      assertEquals(threw, true)
    })
  })

  describe('validateProfile (throws)', () => {
    it('should return valid profile', () => {
      const validProfile = {
        version: '1.0',
        created: '2024-01-01T00:00:00.000Z',
        hardware: { cpu: 'amd', gpu: 'nvidia', peripherals: [] },
        optimizations: [],
        software: [],
      }

      const result = validateProfile(validProfile)
      assertEquals(result.version, '1.0')
    })

    it('should throw on invalid profile', () => {
      const invalidProfile = { version: 123 }
      let threw = false
      try {
        validateProfile(invalidProfile)
      } catch {
        threw = true
      }
      assertEquals(threw, true)
    })
  })

  describe('formatZodErrors', () => {
    it('should format error messages', () => {
      const result = safeParseCatalog({ test: { invalid: true } })
      if (!isParseSuccess(result)) {
        const formatted = formatZodErrors(result.error)
        assertEquals(typeof formatted, 'string')
        assertEquals(formatted.length > 0, true)
      }
    })

    it('should limit to maxIssues', () => {
      const result = safeParseCatalog({
        a: { invalid: true },
        b: { invalid: true },
        c: { invalid: true },
        d: { invalid: true },
      })
      if (!isParseSuccess(result)) {
        const formatted = formatZodErrors(result.error, 2)
        const issueCount = formatted.split(',').length
        assertEquals(issueCount <= 2, true)
      }
    })
  })
})
