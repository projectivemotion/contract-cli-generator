# Objective


clients-cli is a cli to manage your freelance business.

# Features

 - generate a proposal/invoice from your clients.yml and a word template
 - generate the proposal/invoice in pdf (requires libreoffice)
 - compute the total turnover
 - compute your average hourly rate
 - compute the taxes you need to pay
 - compute your profit (turnover-taxes)

# Clients.yml


In your clients.yml, you should put data about your clients

    clients:
        MICROSOFT:
            legal_representor: Bill Gates
            address_street: 02 Blabla Sreet
            address_town: 49670 New York
            address_country: United States
            vat: 4546654564564

# Usage

    USAGE: ct [OPTION1] [OPTION2]... arg1 arg2...
    The following options are supported:
      -h, --hours                   Total number of billed hours
      -g, --generate <ARG1>         Generate a proposal
      -c, --project <ARG1>          Only for one project
      -a, --generateAll             Generate all templates
      -t, --turnover                Total turnover
      -y, --hourly                  Print hourly instead of total
      -x, --taxes                   Total taxes
      -p, --profit                  Total profit
