# Gradient ADK Agents

This directory contains Gradient ADK agent implementations for OptiRoute.

## Agents

### optiroute-support-agent
**Model**: Llama 3.3 70B Instruct  
**Purpose**: In-app support assistant for OptiRoute users

Features:
- Answers questions about bookings, routes, customers, vehicles
- Guides users through common workflows
- 150-word response limit for concise answers

## Quick Start

### Local Development

```bash
cd optiroute-support-agent
gradient agent run
# Agent available at http://localhost:8080
```

### Deploy

```bash
cd optiroute-support-agent
gradient agent deploy
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GRADIENT_MODEL_ACCESS_KEY` | Gradient inference key |

## Project Structure

```
gradient-agents/
├── optiroute-support-agent/
│   ├── .gradient/agent.yml
│   ├── main.py
│   └── requirements.txt
└── README.md
```
