#!/usr/bin/env node

/**
 * Multi-Agent Automation System Test Suite
 * Validates GitHub automation workflows and configurations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutomationTester {
  constructor() {
    this.config = this.loadConfig();
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../automation-config.json');
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('❌ Failed to load automation config:', error.message);
      process.exit(1);
    }
  }

  async runTests() {
    console.log('🧪 Starting Multi-Agent Automation System Tests\n');

    // Test suite
    await this.testWorkflowFiles();
    await this.testConfigurationValidation();
    await this.testAgentProfiles();
    await this.testDependencyChain();
    await this.testProjectStructure();
    await this.testGitHubIntegration();

    this.printResults();
  }

  async testWorkflowFiles() {
    console.log('📄 Testing GitHub Workflow Files...');
    
    const workflowDir = path.join(__dirname, '../workflows');
    const requiredWorkflows = [
      'multi-agent-automation.yml',
      'integration-tests.yml',
      'project-board-sync.yml',
      'agent-coordination.yml'
    ];

    for (const workflow of requiredWorkflows) {
      const filePath = path.join(workflowDir, workflow);
      if (fs.existsSync(filePath)) {
        this.pass(`✅ Workflow file exists: ${workflow}`);
        
        // Basic YAML validation
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('on:') && content.includes('jobs:')) {
            this.pass(`✅ ${workflow} has valid structure`);
          } else {
            this.fail(`❌ ${workflow} missing required structure`);
          }
        } catch (error) {
          this.fail(`❌ ${workflow} validation failed: ${error.message}`);
        }
      } else {
        this.fail(`❌ Missing workflow file: ${workflow}`);
      }
    }
  }

  async testConfigurationValidation() {
    console.log('\n⚙️ Testing Configuration Validation...');

    // Test config structure
    const requiredSections = ['multi_agent_config', 'agent_profiles', 'workflow_rules'];
    for (const section of requiredSections) {
      if (this.config[section]) {
        this.pass(`✅ Config section exists: ${section}`);
      } else {
        this.fail(`❌ Missing config section: ${section}`);
      }
    }

    // Test agent profiles
    const expectedAgents = ['backend-expert', 'frontend-expert', 'marketing-expert', 'automation-expert'];
    for (const agent of expectedAgents) {
      if (this.config.agent_profiles[agent]) {
        this.pass(`✅ Agent profile configured: ${agent}`);
      } else {
        this.fail(`❌ Missing agent profile: ${agent}`);
      }
    }
  }

  async testAgentProfiles() {
    console.log('\n👥 Testing Agent Profile Configuration...');

    for (const [agentName, profile] of Object.entries(this.config.agent_profiles)) {
      const requiredFields = ['domain', 'specialties', 'deliverable_pattern', 'dependencies', 'dependents'];
      
      for (const field of requiredFields) {
        if (profile[field] !== undefined) {
          this.pass(`✅ ${agentName} has ${field}`);
        } else {
          this.fail(`❌ ${agentName} missing ${field}`);
        }
      }
    }
  }

  async testDependencyChain() {
    console.log('\n🔗 Testing Dependency Chain Logic...');

    const chain = this.config.workflow_rules.sequential_dependencies.chain;
    const agents = Object.keys(this.config.agent_profiles);

    // Validate chain completeness
    for (const domain of chain) {
      const agent = `${domain}-expert`;
      if (agents.includes(agent)) {
        this.pass(`✅ Chain domain ${domain} has corresponding agent`);
      } else {
        this.fail(`❌ Chain domain ${domain} missing agent`);
      }
    }

    // Validate dependency relationships
    for (const [agentName, profile] of Object.entries(this.config.agent_profiles)) {
      const domain = profile.domain;
      const chainIndex = chain.indexOf(domain);
      
      if (chainIndex > 0) {
        const expectedDependency = `${chain[chainIndex - 1]}-expert`;
        if (profile.dependencies.includes(expectedDependency)) {
          this.pass(`✅ ${agentName} has correct dependency: ${expectedDependency}`);
        } else {
          this.warning(`⚠️ ${agentName} dependency mismatch with chain order`);
        }
      }
    }
  }

  async testProjectStructure() {
    console.log('\n📁 Testing Project Structure...');

    const requiredDirs = ['deliverables', 'docs', 'src', 'tests', 'config'];
    const projectRoot = path.join(__dirname, '../../..');

    for (const dir of requiredDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        this.pass(`✅ Directory exists: ${dir}/`);
      } else {
        this.warning(`⚠️ Directory missing: ${dir}/`);
      }
    }

    // Test GitHub-specific structure
    const githubFiles = [
      '.github/workflows',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/ISSUE_TEMPLATE',
      '.github/automation-config.json'
    ];

    for (const file of githubFiles) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        this.pass(`✅ GitHub file exists: ${file}`);
      } else {
        this.fail(`❌ Missing GitHub file: ${file}`);
      }
    }
  }

  async testGitHubIntegration() {
    console.log('\n🐙 Testing GitHub Integration...');

    try {
      // Test if we're in a git repository
      execSync('git status', { stdio: 'ignore' });
      this.pass('✅ Git repository detected');

      // Test if remote is set
      const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      if (remote.includes('github.com')) {
        this.pass('✅ GitHub remote configured');
      } else {
        this.warning('⚠️ Remote is not GitHub');
      }

      // Test if gh CLI is available
      try {
        execSync('gh --version', { stdio: 'ignore' });
        this.pass('✅ GitHub CLI available');
      } catch (error) {
        this.warning('⚠️ GitHub CLI not available - some features may not work');
      }

    } catch (error) {
      this.fail('❌ Git/GitHub integration issues detected');
    }
  }

  pass(message) {
    this.results.passed++;
    this.results.details.push({ type: 'pass', message });
    console.log(message);
  }

  fail(message) {
    this.results.failed++;
    this.results.details.push({ type: 'fail', message });
    console.log(message);
  }

  warning(message) {
    this.results.warnings++;
    this.results.details.push({ type: 'warning', message });
    console.log(message);
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 AUTOMATION SYSTEM TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`📊 Total Tests: ${this.results.passed + this.results.failed + this.results.warnings}`);

    const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
    console.log(`🎖️ Success Rate: ${successRate}%`);

    if (this.results.failed === 0) {
      console.log('\n🚀 AUTOMATION SYSTEM READY FOR DEPLOYMENT!');
      console.log('All critical tests passed. The multi-agent coordination system is properly configured.');
    } else {
      console.log('\n⚠️ ISSUES DETECTED - PLEASE RESOLVE BEFORE DEPLOYMENT');
      console.log('Some critical tests failed. Review the results above and fix issues.');
    }

    console.log('\n📋 Next Steps:');
    console.log('1. Commit and push automation files');
    console.log('2. Test with a sample PR from an agent');
    console.log('3. Verify project board synchronization');
    console.log('4. Monitor agent coordination notifications');
    console.log('='.repeat(60));
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new AutomationTester();
  tester.runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = AutomationTester;