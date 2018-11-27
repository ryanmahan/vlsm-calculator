import math, ipaddress
from flask import Flask, request, json
app = Flask(__name__)

@app.route('/')
def calculate():
    starting_address = ipaddress.ip_address(request.args.get("starting_address"))
    subnet_sizes = request.args.get("subnet_sizes")
    print(starting_address, subnet_sizes)
    subnet_sizes = json.loads(subnet_sizes)
    subnet_sizes = map(lambda x: x+2, subnet_sizes)
    subnet_sizes = sorted(subnet_sizes, reverse=True)
    print(subnet_sizes)
    for subnet in subnet_sizes:
        bits = math.ceil(math.log(subnet, 2))
        addresses = 2**bits
        usable = addresses-2
        slash = 32-bits
        address = starting_address
        start = address+1
        end = address+usable
        broadcast = end+1
        usable_range = str(start) + "-" + str(end)
        starting_address = broadcast+1
        print(subnet-2, "\t", address, "\t", broadcast, "\t", usable_range, "\t", slash)
    return("success")


