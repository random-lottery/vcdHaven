# vcdHaven
Virtual "VCD players" simulate the nostalgic viewing experience.
Deno Deployment (Recommended)
Fork this project

Login/Register at https://dash.deno.com/

Create a project at https://dash.deno.com/new_project

Select this project, enter project name (please choose carefully as it affects the auto-assigned domain)

Set Entrypoint to src/deno_index.ts, leave other fields empty

See image
Click Deploy Project

After successful deployment, you'll get a domain name. The site is ready to use, and the domain can also be used as a Chat API proxy.

Cloudflare Worker Deployment
Deploy to Cloudflare Workers

Click the deploy button

Login to your Cloudflare account

Enter Account ID and API Token

Fork this project, enable Github Action

Deploy, open dash.cloudflare.com to view the deployed worker

For use in China, a custom domain name needs to be bound

See image
When using Cloudflare in China, you might encounter "400: User location is not supported for the API use." This might be due to Cloudflare routing to Hong Kong CDN nodes in the Guangdong-Hong Kong region. Recommend switching to Deno deployment.

Local Development
Install Deno on Windows:

irm https://deno.land/install.ps1 | iex

Install Deno on Mac/Linux:

curl -fsSL https://deno.land/install.sh | sh

Start the project:

cd project_directory
deno run --allow-net --allow-read src/deno_index.ts
